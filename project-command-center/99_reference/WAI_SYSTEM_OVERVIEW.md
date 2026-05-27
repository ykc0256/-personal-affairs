# WAI 시스템 전체 구조 개요

> 작성일: 2026-05-19  
> 대상 독자: WAI 플랫폼을 처음 접하는 누구나

---

## 목차

1. [WAI가 무엇인가](#1-wai가-무엇인가)
2. [전체 시스템 구조](#2-전체-시스템-구조)
3. [각 레이어의 역할](#3-각-레이어의-역할)
4. [도메인별 데이터 & 역할](#4-도메인별-데이터--역할)
5. [DB 테이블 구조](#5-db-테이블-구조)
6. [MinIO 버킷 구조](#6-minio-버킷-구조)
7. [DB ↔ MinIO 연결 방식](#7-db--minio-연결-방식)
8. [API가 DB/MinIO와 다른 점](#8-api가-dbminio와-다른-점)
9. [프로젝트 진행 시 데이터 흐름](#9-프로젝트-진행-시-데이터-흐름)
10. [접속 정보 & 보안 원칙](#10-접속-정보--보안-원칙)

---

## 1. WAI가 무엇인가

**WAI(Water AI)는 수처리 시설 설계 통합 플랫폼입니다.**

상하수도 처리 시설을 설계할 때 필요한 전 과정 — 공정 선택, 수질 기준 설정, 장비 선정, 전기 설계, 3D 모델 배치, 도면 관리 — 을 하나의 대시보드에서 처리합니다.

```
수질 파라미터 입력
      ↓
처리 공정 선택 (침전, 생물처리, 소독 등)
      ↓
장비 선정 (펌프, 송풍기 등 3D 모델 포함)
      ↓
전기 설계 (동력설비 목록, 계측기, MCC 편성)
      ↓
계산식 실행 (용량 계산서)
      ↓
도면 & 산출물 출력 (P&ID, MCC 구성도 등)
```

---

## 2. 전체 시스템 구조

```
┌──────────────────────────────────────────┐
│           Vue.js 대시보드                 │
│        (사용자가 보는 화면)               │
└─────────────────┬────────────────────────┘
                  │ HTTP / REST API
                  ▼
┌──────────────────────────────────────────┐
│         WAI API 서버                     │
│         172.16.0.20:8000                 │
│  - 인증(JWT) 처리                        │
│  - 비즈니스 로직 (자동계산, 집계 등)     │
│  - DB & MinIO 접근 중개                  │
└──────────┬───────────────────┬───────────┘
           │                   │
           ▼                   ▼
┌─────────────────┐  ┌──────────────────────┐
│   PostgreSQL    │  │       MinIO           │
│ 172.16.0.20     │  │  172.16.0.20:9000    │
│ :5432           │  │                      │
│ DB: postgres    │  │  파일 스토리지        │
│ Schema:         │  │  (3D모델, 도면,       │
│ bkt_wai_design  │  │   계산식, 카탈로그)  │
└─────────────────┘  └──────────────────────┘
```

### 각 연결을 Claude Code에서 사용하는 방법

| 연결 대상 | MCP 서버 | 사용 방법 |
|-----------|----------|-----------|
| PostgreSQL | `postgres` (npx) | 자연어로 질문 → SQL 자동 생성 후 실행 |
| MinIO | `minio` (Python) | 버킷/파일 목록 조회, 텍스트 파일 읽기 |
| WAI API | `wai-api` (Python) | 엔드포인트 목록 조회, API 직접 호출 |

---

## 3. 각 레이어의 역할

### PostgreSQL — 모든 데이터의 원본

- 장비 정보, 프로젝트, 공정, 수질 파라미터, 전기 설계 목록 등 **구조화된 데이터** 저장
- 스키마: `bkt_wai_design`
- 계정: `postgres_read` (읽기 전용)

### MinIO — 파일 스토리지

- DB에 등록된 장비/구조물/도면에 연결된 **실제 파일** 보관
- 3D 모델(dtdx), Revit 패밀리(rfa), 도면(pdf/dwg), 계산식(xlsx), 썸네일(png) 등
- 18개 버킷으로 도메인별 분리
- 계정: `waiuser` (읽기 전용 커스텀 정책)

### WAI API — 대시보드의 백엔드

- Vue.js 대시보드가 실제로 호출하는 서버
- DB와 MinIO 위에서 **인증, 자동 계산, 집계** 등을 처리
- 단순 조회는 DB와 내용이 같지만, **계산/집계/파일 처리**는 API에서만 가능

---

## 4. 도메인별 데이터 & 역할

### Auth — 인증 & 권한

대시보드 로그인과 메뉴별 접근 권한을 관리합니다.

| 데이터 | 내용 |
|--------|------|
| Users | 계정 정보 (아이디, 비밀번호, 이름) |
| Roles | 역할 정의 (관리자, 일반사용자 등) |
| Permissions | 기능별 허용 권한 |
| RolePermissions | 역할 ↔ 권한 매핑 |
| SystemMenus | 대시보드 메뉴 항목 정의 |
| MenuPermissions | 메뉴별 역할 접근 제어 |
| MenuAccessLogs | 사용자별 메뉴 접근 이력 |

---

### Project — 프로젝트 관리

하나의 **프로젝트**가 설계 전체를 묶는 컨테이너 역할을 합니다.

| 데이터 | 내용 |
|--------|------|
| Projects | 프로젝트 기본 정보 (이름, 발주처, 상태) |
| Clients | 발주처(클라이언트) 정보 |
| SiteInfo | 현장 정보 (위치, 부지 조건 등) |
| ProjectVersions | 프로젝트 버전 이력 |
| ProjectPhaseStatus | 단계별(기본설계/실시설계 등) 진행 상태 |
| ProjectActivityLogs | 작업 이력 로그 |
| ProjectRecommended | 추천 프로젝트 템플릿 풀 |
| **ProjectWaterQuality** | **프로젝트별 유입 수질 파라미터** (BOD, SS, TN, TP 등) |
| ProjectFlowTypes | 유입 성상 매핑 (생활하수/오수/슬러지 등) |
| ProjectProcesses | 프로젝트에 포함된 공정 목록 |
| ProjectEquipmentSelections | 프로젝트에서 선택된 장비 목록 |
| ProjectStructureSelections | 프로젝트에서 선택된 구조물 목록 |
| **ProjectFormulaRuns** | **계산식 실행 이력** (어떤 입력값으로 어떤 결과가 나왔는지) |
| DrawingMasters | 프로젝트 도면 마스터 목록 |
| Project3dModelFiles | 프로젝트에 배치된 3D 모델 목록 |

---

### Equipment — 장비 & 전기 설계

#### 기계 장비

| 데이터 | 내용 |
|--------|------|
| EquipmentCatalog | 장비 마스터 DB (모델별 스펙, JSONB 속성) |
| EquipmentFiles | 장비별 파일 경로 (3D모델, Revit 패밀리, 썸네일) |
| EquipmentPriceHistory | 장비 가격 이력 |
| Vendors | 공급업체 정보 |
| 3D PresetMasters / Details | 3D 배치용 표준 프리셋 (직경별 조합 등) |
| 3D Library | 구조물/장비 이외의 3D 오브젝트 |

#### 전기 설계 (Electric)

| 데이터 | 내용 | 특이사항 |
|--------|------|----------|
| **ElecInstrumentList** | 계측기 목록 | 신호 타입별 전선관 규격 **자동 채움** |
| **ElecEquipLoadList** | 동력설비 부하 목록 | MCC별/프로젝트 전체 **부하 집계** |
| **ElecPowerEquipList** | 동력설비 리스트 | MCC 구성도, 결선도, 현장조작반 외형도 데이터 출력 |
| Electric References | 기준 데이터 조회 | CV/GV 전선 단면적, 차단기 모델, MCC 크기, 전선 외경 |

> **자동 채움(auto_fill)**: 장비 타입(equipment_type)을 입력하면 전선 규격, MCC 크기 등이 기준 데이터를 참조해 자동 계산됩니다.

---

### Process — 공정 & P&ID

수처리 공정과 P&ID 도면 관련 데이터를 관리합니다.

| 데이터 | 내용 |
|--------|------|
| ProcessMasters | 공정 마스터 (생물반응조, 침전지, 소독조 등) |
| PID Components | P&ID 도면 내 개별 구성요소 (밸브, 계측기, 배관 등) |
| PID-Excel Mapping | P&ID 도면 ↔ 엑셀 산출물 자동 매핑 관계 |
| ProcessStructureSelections | 공정에 연결된 구조물 선택 |
| 용량계산서 (CCS) | 공정별 용량 계산 결과 |

---

### Structure — 구조물 라이브러리

| 데이터 | 내용 |
|--------|------|
| Structures | 구조물 마스터 (반응조, 침전지, 펌프장 등 계층 구조) |
| 연결 파일 | 구조물별 2D 도면, 3D 모델(dtdx), RVT, 계산식(xlsx), 썸네일 |

---

### Common — 공통 마스터 데이터

시스템 전체에서 참조하는 기준 데이터입니다.

| 데이터 | 내용 |
|--------|------|
| CommonCodes | 장비/구조물/공정 분류 코드 체계 (계층 구조) |
| SystemCodes | 시스템 구분 코드 (ELEC, MECH 등) |
| FormulaLibrary | 설계 계산식 파일 저장소 |
| Symbols | P&ID 도면 심볼 마스터 |
| Units / UnitCategories / UnitSystems | 단위 체계 정의 (METRIC / USCS) |
| WaterQualityParameters | 수질 항목 정의 (BOD, COD, SS, TN, TP 등) |
| WaterFlowTypes | 유입 성상 종류 (생활하수, 오수, 슬러지 등) |
| WaterFlowTypeParameters | 성상별 수질 항목 기본값 |
| MultilingualTerms | 한/영 다국어 용어 |

---

## 5. DB 테이블 구조

스키마: `bkt_wai_design`

```
공통 마스터
├── common_codes          — 장비/구조물/공정 코드 체계 (계층형)
├── system_codes          — 시스템 구분 코드
├── units                 — 단위 정의 (m, kg, kW 등)
├── unit_categories       — 단위 카테고리
├── unit_systems          — 단위 시스템 (METRIC/USCS)
├── water_quality_parameters — 수질 항목 (BOD, COD 등)
├── water_flow_types      — 유입 성상 종류
├── water_flow_type_parameters — 성상별 수질 기본값
├── formula_library       — 계산식 메타정보
├── symbols               — 도면 심볼
└── multilingual_terms    — 다국어 용어

프로젝트
├── projects              — 프로젝트 기본 정보
├── clients               — 발주처
├── site_info             — 현장 정보
├── project_versions      — 버전 이력
├── project_phase_status  — 단계별 진행 상태
├── project_activity_logs — 작업 이력
├── project_recommended   — 추천 프로젝트 템플릿
├── project_water_quality — 프로젝트별 수질 파라미터
├── project_flow_types    — 유입 성상 매핑
├── project_processes     — 포함된 공정 목록
├── project_equipment_selections — 선택된 장비
├── project_structure_selections — 선택된 구조물
├── project_formula_runs  — 계산식 실행 이력
├── drawing_masters       — 도면 마스터
└── project_3d_model_files — 배치된 3D 모델

장비
├── equipment_catalog     — 장비 모델 스펙 (model_file_id, rfa_file_id)
├── equipment_files       — 장비 파일 경로 (MinIO 경로 포함)
├── equipment_price_history — 가격 이력
├── vendors               — 공급업체
├── preset_masters        — 3D 프리셋
├── 3d_library            — 3D 오브젝트 라이브러리
├── elec_instrument_list  — 계측기 목록
├── elec_equip_load_list  — 동력설비 부하 목록
└── elec_power_equip_list — 동력설비 리스트

공정 & 구조물
├── process_masters       — 공정 마스터
├── pid_components        — P&ID 구성요소
├── process_pid_excel_relations — P&ID ↔ 엑셀 매핑
├── process_structure_selections — 공정-구조물 연결
└── structures            — 구조물 마스터

인증
├── users                 — 사용자 계정
├── roles                 — 역할 정의
├── permissions           — 권한 정의
├── role_permissions      — 역할-권한 매핑
├── user_roles            — 사용자-역할 매핑
├── system_menus          — 메뉴 항목
├── menu_permissions      — 메뉴-역할 접근 제어
├── user_menu_permissions — 사용자별 메뉴 권한
├── menu_access_logs      — 메뉴 접근 로그
├── refresh_tokens        — 갱신 토큰
└── token_blacklist       — 무효화된 토큰

파일 관리
└── minio_file_uploads    — MinIO 업로드 이력 (DB ↔ MinIO 연결 고리)
```

---

## 6. MinIO 버킷 구조

총 18개 버킷. 각 버킷은 특정 DB 테이블과 연결됩니다.

| 버킷 | 연결 DB 테이블 | 파일 종류 | 파일 수 |
|------|--------------|-----------|---------|
| `wai-equipment-files` | equipment_files | dtdx, rfa, png | 1,800 |
| `wai-formula-library` | formula_library | xlsx, pdf | 1,525 |
| `wai-drawing-files` | drawing_files | 도면 파일 | 1,100 |
| `wai-project-docs` | project_documentations | 문서 | 834 |
| `wai-equipment-catalog` | equipment_catalog | pdf (카탈로그) | 664 |
| `wai-project` | (직접 연결 없음) | 프로젝트 데이터 | 315 |
| `wai-symbols` | symbols | 심볼 파일 | 492 |
| `wai-3d-models` | project_3d_model_files | 3D 모델 | 154 |
| `wai-site-info` | site_info | 현장 정보 파일 | 208 |
| `wai-3d-library` | 3d_library | 3D 라이브러리 | 28 |
| `wai-process-masters` | process_masters | 공정 파일 | 70 |
| `wai-3d-assets` | equipment_files | 3D 에셋 | 40 |
| `wai-common-codes` | common_codes | 공통코드 파일 | 2 |
| `wai-process-pid` | process_pid_excel_relations | P&ID 파일 | 2 |
| `wai-units` | units | 단위 파일 | 8 |
| `wai-vendors` | vendors | 벤더 파일 | 13 |
| `wai-output-statement` | (DB 미등록) | 산출서 JSON | 5 |
| `wai-project-tmp` | (DB 미등록) | 임시 파일 | 6 |

### 파일 형식 정의

| 확장자 | 용도 |
|--------|------|
| `.dtdx` | DataCube 3D 모델 (장비/구조물 3D 뷰어용) |
| `.rfa` | Revit 패밀리 (BIM 연동용) |
| `.rvt` | Revit 프로젝트 파일 |
| `.xlsx` | 계산식, 산출서, 마이그레이션 데이터 |
| `.pdf` | 장비 카탈로그, 도면 |
| `.png` | 장비 썸네일 이미지 |
| `.json` | 산출서 리포트 |

---

## 7. DB ↔ MinIO 연결 방식

MinIO 파일은 UUID 기반 경로를 사용하므로 **반드시 DB에서 경로를 먼저 조회**해야 합니다.

### 연결 구조

```
minio_file_uploads 테이블 (중앙 연결 테이블)
├── id              — 레코드 고유 ID (UUID)
├── table_name      — 연결된 DB 테이블명
├── record_id       — 해당 테이블의 레코드 ID
├── bucket_name     — MinIO 버킷명
├── file_path       — 버킷 내 파일 경로
├── original_filename — 원본 파일명
├── file_size       — 파일 크기
├── mime_type       — 파일 타입
├── upload_status   — 업로드 상태 (completed)
└── uploaded_at     — 업로드 일시
```

### 장비 파일 조회 흐름 (가장 복잡한 예시)

```
① common_codes
   code_key = 'M_PMP080301' (일축스크류 모노펌프)
        │
        ▼
② equipment_catalog
   equipment_type = 'M_PMP080301'
   model_file_id  = 'c01fc983-...'   ← 3D 모델 파일 ID
   rfa_file_id    = '918239d3-...'   ← Revit 패밀리 파일 ID
        │
        ▼
③ equipment_files
   file_id   = 'c01fc983-...'
   file_path = 'wai-equipment-files/c01fc983-.../M_PMP080301.rfa'
        │
        ▼
④ MinIO: wai-equipment-files 버킷
   경로: c01fc983-.../M_PMP080301.rfa  ← 실제 파일
```

### 파일 경로 규칙

```
{bucket_name}/{file_id}/{파일명}

파일명 규칙 (장비):
{equipment_type}_{vendor_code}_{model_number}_{단위그룹}_{용량}.{확장자}

예: wai-equipment-files/c01fc983-.../M_PMP080301_VM_MONAS_KA30_GC250_3.34.dtdx
```

---

## 8. API가 DB/MinIO와 다른 점

단순 CRUD 엔드포인트는 DB를 그대로 노출한 것이지만, 아래는 **API 레이어에서만 처리되는 기능**입니다.

### 자동 채움 (Auto Fill)

장비 타입을 입력하면 기준 데이터를 참조해 전기 설계값을 자동 계산합니다.

```
equipment_type 입력
      ↓
Electric References 기준 데이터 참조
  - CV/GV 전선 단면적
  - 차단기 모델
  - MCC 크기
  - 전선 외경
      ↓
elec_instrument_list / elec_power_equip_list 자동 채움
```

### MCC 집계

```
GET /elec_equip_load_list/mcc/{mcc_no}/summary
→ 특정 MCC 패널의 총 부하 집계 (kW, A)

GET /elec_equip_load_list/project_summary
→ 프로젝트 전체 동력 합계
```

### 도면 데이터 출력 (Public API)

대시보드 외부에서도 접근 가능한 도면 생성용 데이터 엔드포인트입니다.

| 엔드포인트 | 출력 도면 |
|-----------|----------|
| `/api/public/v1/equipment/elec-power-equip-list/mccd` | MCC 구성도 |
| `/api/public/v1/equipment/elec-power-equip-list/mswd` | 전동기 기동반 결선도 |
| `/api/public/v1/equipment/elec-power-equip-list/lcpo` | 현장조작반 외형도 |

### V2 검색 (Redis 캐싱)

장비 카탈로그 검색은 V2에서 Redis 캐시를 사용해 성능이 최적화되어 있습니다.

```
POST /api/v1/equipment/equipment_catalog/v2/search
→ Redis 캐시 기반 빠른 검색
```

### 계산식 실행

계산식 파일(xlsx)을 특정 입력값으로 실행하고 결과를 `project_formula_runs`에 저장합니다.

---

## 9. 프로젝트 진행 시 데이터 흐름

```
STEP 1. 프로젝트 생성
  └─ projects 테이블에 기본 정보 저장
  └─ clients, site_info 연결

STEP 2. 수질 & 공정 설정
  └─ project_water_quality — 유입 수질 파라미터 입력 (BOD, SS, TN 등)
  └─ project_flow_types — 유입 성상 선택
  └─ project_processes — 처리 공정 선택 및 매핑

STEP 3. 장비 & 구조물 선정
  └─ equipment_catalog 에서 모델 검색 (common_codes 계층 참조)
  └─ project_equipment_selections — 선택된 장비 등록
  └─ project_structure_selections — 선택된 구조물 등록
  └─ project_3d_model_files — 3D 모델 배치 위치 저장

STEP 4. 계산식 실행
  └─ formula_library 에서 해당 공정/장비 계산식 파일 조회
  └─ project_formula_runs — 입력값과 결과 이력 저장

STEP 5. 전기 설계
  └─ elec_power_equip_list — 동력설비 등록 (장비 타입 기반 자동 채움)
  └─ elec_instrument_list — 계측기 등록 (신호 타입 기반 전선 규격 자동 채움)
  └─ MCC 편성 및 부하 집계

STEP 6. 도면 & 산출물 출력
  └─ drawing_masters — 도면 메타정보 등록
  └─ MinIO 버킷에 파일 저장 (minio_file_uploads 이력 기록)
  └─ P&ID → pid_components, process_pid_excel_relations 매핑
  └─ 도면 생성용 API 호출 (MCC 구성도, 결선도 등)
```

---

## 10. 접속 정보 & 보안 원칙

### 접속 정보

| 시스템 | 주소 | 계정 | 권한 |
|--------|------|------|------|
| PostgreSQL | 172.16.0.20:5432 | postgres_read | SELECT 전용 |
| MinIO | 172.16.0.20:9000 | waiuser | 조회/읽기 전용 |
| WAI API | 172.16.0.20:8000 | ykc / 1234 | 일반 사용자 |

### 보안 원칙

| 레이어 | 적용 내용 |
|--------|-----------|
| PostgreSQL | SELECT 전용 계정 + 세션 READ ONLY 이중 차단 |
| MinIO | wai-readonly 커스텀 정책 (ListBucket + GetObject만) |
| 자격증명 | `.mcp.json`, `.env` → git 제외, 로컬 전용 |
| 네트워크 | 사내망(172.16.0.20) 내부에서만 접근 가능 |

### 알려진 이슈

| 이슈 | 내용 | 영향 |
|------|------|------|
| drawing_files 버킷명 오타 | DB에 `drawing_files`로 저장 (`wai-` 누락), 1,069건 | MinIO 직접 접근 시 오류 발생 |
| DB 미등록 버킷 | `wai-output-statement`, `wai-project`, `wai-project-tmp` | 3개 버킷은 minio_file_uploads를 우회해 저장됨 |

---

## 부록 — Claude Code에서 자주 쓰는 조회 패턴

### 특정 장비의 3D 파일 경로 찾기

```sql
SELECT
    ec.equipment_type,
    ec.model_number,
    ef.file_name,
    ef.file_path,
    ef.file_type
FROM bkt_wai_design.equipment_catalog ec
JOIN bkt_wai_design.equipment_files ef
    ON ef.file_id = ec.model_file_id
WHERE ec.equipment_type = 'M_PMP080301'
ORDER BY ec.model_number;
```

### 프로젝트별 전기 동력설비 목록

```sql
SELECT *
FROM bkt_wai_design.elec_power_equip_list
WHERE project_id = '프로젝트UUID'
ORDER BY mcc_no, seq_no;
```

### 계산식 실행 이력

```sql
SELECT *
FROM bkt_wai_design.project_formula_runs
WHERE project_id = '프로젝트UUID'
ORDER BY created_at DESC
LIMIT 20;
```

### MCC별 부하 합계

```sql
SELECT
    mcc_no,
    SUM(capacity_kw) AS total_kw,
    COUNT(*) AS equip_count
FROM bkt_wai_design.elec_power_equip_list
WHERE project_id = '프로젝트UUID'
GROUP BY mcc_no
ORDER BY mcc_no;
```
