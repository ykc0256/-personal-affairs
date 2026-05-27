# TDD — 2D 생성 규칙 (P&ID / PFD) v0.1

작성일: 2026-05-19  
작성자: 최윤규  
상태: 초안 — ⚠️ SVG 생성 로직 자료 미입수, 데이터 연결 구조 위주 정리

---

## 1. 개요

### 1-1. 산출물

| 산출물 | 형식 | 저장 위치 |
|---|---|---|
| P&ID 도면 | SVG | MinIO `wai-drawing-files/{drawing_id}/` |
| PFD 도면 | SVG | MinIO `wai-symbols/{symbol_id}/` |
| P&ID 매핑 결과 | JSON | MinIO `wai-project/{project_id}/pid.json` |

### 1-2. 생성 트리거

공정 선택 완료 후 P&ID 매핑 엔진 실행 → pid.json 생성 → SVG 도면 생성

---

## 2. 데이터 연결 구조

### 2-1. 입력 데이터 흐름

```
[사용자 공정 선택]
  process_masters (공정 마스터)
        ↓
[공정 구성요소 조회]
  process_pid_components (공정별 장비 코드 → 카탈로그 타입 매핑)
        ↓
[P&ID 템플릿 변수 매핑]
  process_pid_excel_relations (DataIn + DataGen)
        ↓
[pid.json 생성]
  mapping_result + data_instrument[] + drawing URL
        ↓
[SVG 도면 생성]
  wai-drawing-files (P&ID)
  wai-symbols (PFD)
```

### 2-2. DB 테이블 역할

| 테이블 | 역할 |
|---|---|
| `process_masters` | 공정 마스터 (process_id, process_name 등) |
| `process_pid_components` | 공정별 구성요소 코드 → 카탈로그 타입 매핑 |
| `process_pid_excel_relations` | P&ID 심볼코드 → 템플릿 변수 → 실제 값 매핑 규칙 |

---

## 3. process_pid_components

### 3-1. 구조

공정 하나에 포함된 장비/구조물 구성요소를 정의:

| 컬럼 | 설명 | 예시 |
|---|---|---|
| `process_id` | 공정 ID | 319 (STRG_TRT0103) |
| `component_code` | 구성요소 코드 (내부 식별자) | `con1`, `agt1`, `pmp1` |
| `component_type` | 카탈로그 타입 코드 | `S_CON01D`, `M_AGT0602`, `M_PMP0601` |

### 3-2. 예시 (process_id=319, STRG_TRT0103)

| component_code | component_type | 의미 |
|---|---|---|
| `con1` | `S_CON01D` | 콘크리트 구조물 (CON_TYPE D) |
| `agt1` | `M_AGT0602` | 수중횡축 프로펠러형 교반기 |
| `pmp1` | `M_PMP0601` | 스프르트펌프 |

---

## 4. process_pid_excel_relations

### 4-1. DataGen — P&ID 심볼 → 템플릿 변수 매핑

| 컬럼 | 설명 |
|---|---|
| `pid_symbol_code` | P&ID 심볼 코드 (e.g. `G0103C01`) |
| `template_variable` | 템플릿 변수명 (e.g. `{con1_name}`) |
| `data_source` | 값 생성 규칙 (고정값 / DB 조회 / 계산) |

**DataGen 매핑 예시 (STRG_TRT0103):**

| P&ID 심볼 코드 | 템플릿 변수 | 최종 값 (pid.json mapping_result) |
|---|---|---|
| `G0103C01` | `{con1_name}` | "treatment tank" |
| `G0103M101` | `{agt1_no}` | "M-101" |
| `G0103M102` | `{pmp1_no}` | "M-102" |
| `G0103M201` | `{agt1_name}` | "treatment tank mixer" |
| `G0103M202` | `{pmp1_name}` | "treated water transfer pump" |
| `G0103PW01` | `{info1_size}-RAW-{info1_bm}` | "125A-RAW-STS" |
| `G0103V1W101` | `BV-{no_process}001` | "BV-1001" |
| `G0103IW201` | `{no_process}001` | "1001" |

### 4-2. DataIn — 입력 변수

| 변수 | 설명 | 입력 경로 |
|---|---|---|
| `{no_process}` | 공정 번호 (e.g. 1001) | 사용자 입력 또는 자동 부여 |
| `{info1_size}` | 배관 구경 (e.g. 125A) | ⚠️ 실제 값 주입 경로 미확인 |
| `{info1_bm}` | 배관 재질 (e.g. STS) | ⚠️ 실제 값 주입 경로 미확인 |
| `{con1_name}` | 구조물 이름 | equipment_catalog 또는 고정값 |
| `{agt1_no}` / `{pmp1_no}` | 장비 태그번호 | 기계번호 자동 부여 |
| `{agt1_name}` / `{pmp1_name}` | 장비명 | equipment_catalog.name |

---

## 5. pid.json 구조

### 5-1. 파일 위치

MinIO: `wai-project/{project_id}/pid.json`

### 5-2. 주요 키

| 키 | 설명 |
|---|---|
| `mapping_result` | 심볼코드 → 최종 값 매핑 딕셔너리 |
| `data_instrument[]` | 계측기 태그 템플릿 목록 |
| `drawing_url` | SVG 도면 참조 URL (wai-drawing-files 버킷) |

### 5-3. mapping_result 예시

```json
{
  "G0103C01": "treatment tank",
  "G0103M101": "M-101",
  "G0103M102": "M-102",
  "G0103M201": "treatment tank mixer",
  "G0103M202": "treated water transfer pump",
  "G0103PW01": "125A-RAW-STS",
  "G0103V1W101": "BV-1001",
  "G0103IW201": "1001"
}
```

### 5-4. data_instrument[] 예시

```json
[
  {
    "tag_no_value": "LIT-{no_process}001",
    "tag_code_value": "I_WTG02",
    "tag_name_value": "Level transmitter",
    "instrument_type": "LIT"
  }
]
```

→ `{no_process}` 치환 후 `elec_instrument_list`에 저장:  
`LIT-1001` / `I_WTG02` / 레이더식 수위계

---

## 6. SVG 도면 생성

### 6-1. P&ID SVG

- 저장 버킷: `wai-drawing-files`
- 파일명 패턴: `M_260304_G0103P_C1_A10_P03_O01.svg`
- 생성 방식: pid.json `mapping_result`의 변수를 P&ID 템플릿 SVG에 주입

> ⚠️ **SVG 생성 로직 자료 미입수** — 개발 담당자(이안) 확인 필요  
> 템플릿 SVG 위치, 변수 치환 방식, 렌더링 엔진 미확인

### 6-2. PFD SVG

- 저장 버킷: `wai-symbols`
- 파일명 패턴: `260317_G0103F_A1_P0_O1.svg`
- 생성 방식: ⚠️ 미확인

### 6-3. drawing_files DB 연결

| 테이블 | 역할 |
|---|---|
| `drawing_files` | SVG 파일 메타데이터 (drawing_id, file_path 등) |

> `drawing_files`는 `project_id`가 아닌 `drawing_id`를 FK로 사용하는 구조  
> 프로젝트 → 도면 파일 연결 경로: `projects` → `project_processes` → `drawing_files`

---

## 7. 계측기 흐름 요약

```
pid.json data_instrument[]
        ↓ {no_process} 치환
elec_instrument_list (DB)
        ↓
전기계산서 — 계측기리스트 시트
        ↓
BOQ — 전기 기자재내역서 (케이블, 전선관 수량)
```

---

## 8. 미확인 항목 (⚠️)

| # | 항목 | 확인 방법 |
|---|---|---|
| 1 | SVG 생성 엔진 및 템플릿 위치 | 이안 확인 / 소스코드 |
| 2 | PFD SVG 생성 로직 | 소스코드 |
| 3 | DataIn 변수 ({info1_size}, {info1_bm} 등) 실제 값 주입 경로 | 소스코드 |
| 4 | drawing_files ↔ projects 연결 테이블 구조 | DB 스키마 확인 |
| 5 | 공정 번호(no_process) 자동 부여 규칙 | 소스코드 |
| 6 | 다중 공정 선택 시 P&ID 도면 합성 방식 | 소스코드 |

---

## 9. 참고 파일

| 파일 | 용도 |
|---|---|
| MinIO `wai-drawing-files/019d2353-.../M_260304_G0103P_C1_A10_P03_O01.svg` | P&ID SVG 결과 기준 |
| MinIO `wai-symbols/73ca970b-.../260317_G0103F_A1_P0_O1.svg` | PFD SVG 결과 기준 |
| `02_projects/tdd/system-data-flow.md` | 전체 데이터 연결 구조 (섹션 2) |
