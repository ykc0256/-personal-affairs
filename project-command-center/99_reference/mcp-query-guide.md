# WAI DB + MinIO 조회 규칙 가이드

> 최종 업데이트: 2026-05-18  
> 장비 파일 조회 시 DB → MinIO 순서로 접근한다. MinIO 파일명은 UUID 기반이므로 파일명 직접 검색 불가.

---

## 목차

1. [핵심 원칙](#1-핵심-원칙)
2. [장비 파일 조회 4단계](#2-장비-파일-조회-4단계)
3. [테이블 관계 및 역할](#3-테이블-관계-및-역할)
4. [장비 코드 체계 (common_codes)](#4-장비-코드-체계-common_codes)
5. [equipment_files 파일 경로 규칙](#5-equipment_files-파일-경로-규칙)
6. [파일 유형 정의](#6-파일-유형-정의)
7. [벤더 코드 규칙](#7-벤더-코드-규칙)
8. [자주 쓰는 조회 쿼리 패턴](#8-자주-쓰는-조회-쿼리-패턴)
9. [주의사항 및 알려진 특이점](#9-주의사항-및-알려진-특이점)

---

## 1. 핵심 원칙

```
MinIO 파일명 = UUID 폴더 → 직접 검색 불가
반드시 DB에서 file_id(UUID)를 먼저 조회 후 MinIO 경로 구성
```

| 단계 | 위치 | 목적 |
|------|------|------|
| ① 장비 명칭 검색 | `common_codes` | 한글 장비명 → `code_key` 확인 |
| ② 장비 목록 조회 | `equipment_catalog` | `equipment_type`으로 모델 목록 + `model_file_id`, `rfa_file_id` 확인 |
| ③ 파일 경로 조회 | `equipment_files` | `file_id`로 실제 `file_path`, `file_type`, `file_size` 확인 |
| ④ MinIO 접근 | `wai-equipment-files` 버킷 | `file_path` 그대로 사용 |

---

## 2. 장비 파일 조회 4단계

### Step 1 — 장비 코드 찾기 (`common_codes`)

한글 장비명이나 영문명으로 `code_key`를 찾는다.

```sql
SELECT code_key, code_value, code_value_en, description, parent_key
FROM bkt_wai_design.common_codes
WHERE code_value ILIKE '%모노%'
   OR code_value_en ILIKE '%mono%'
   OR code_key ILIKE '%PMP%'
ORDER BY code_key;
```

> 결과의 `code_key`가 `equipment_catalog.equipment_type`에 대응된다.

---

### Step 2 — 장비 목록 + 파일 ID 조회 (`equipment_catalog`)

```sql
SELECT
    equipment_id,
    equipment_code,
    equipment_type,
    model_number,
    model_file_id,   -- 3D 모델 파일 ID (dtdx)
    rfa_file_id,     -- Revit 패밀리 파일 ID
    thumbnail_id,    -- 썸네일 이미지 ID
    unit_system_code -- METRIC / USCS
FROM bkt_wai_design.equipment_catalog
WHERE equipment_type IN ('M_PMP080301', 'M_PMP080302')  -- Step 1에서 찾은 code_key
ORDER BY equipment_type, model_number;
```

> `model_file_id IS NULL`인 경우 해당 모델은 3D 파일 미등록 상태.  
> USCS 단위계(`USCS_` 접두사) 항목은 대부분 파일 미등록.

---

### Step 3 — 실제 파일 경로 조회 (`equipment_files`)

```sql
SELECT
    file_id,
    equipment_type,
    file_name,
    file_path,        -- MinIO 경로 (버킷명 포함)
    file_type,        -- dtdx / rfa / png / pdf 등
    file_size,        -- MB 단위
    file_category,    -- 3D_MODEL / RFA_FAMILY / THUMBNAIL / CATALOG 등
    unit_system_code,
    minio_id
FROM bkt_wai_design.equipment_files
WHERE equipment_type IN ('M_PMP080301', 'M_PMP080302')
ORDER BY file_category, file_name;
```

---

### Step 4 — MinIO에서 파일 접근

Step 3의 `file_path`가 MinIO 경로 그대로다.

```
file_path 예시:
  wai-equipment-files/{file_id}/{파일명}

실제 예시:
  wai-equipment-files/c01fc983-8e77-4cc6-95d4-877f6eddb7f7/M_PMP080301.rfa
  wai-equipment-files/918239d3-03a3-4dea-8e62-fda813e56db9/M_PMP080301_VM_MONAS_KA15_GC250_0.45.dtdx
```

Python으로 파일 정보 확인:

```python
from minio import Minio
client = Minio('172.16.0.20:9000', access_key='waiuser', secret_key='waiuserpassword', secure=False)

bucket = "wai-equipment-files"
object_name = "{file_id}/{파일명}"   # file_path에서 버킷명 제거한 나머지

stat = client.stat_object(bucket, object_name)
```

---

## 3. 테이블 관계 및 역할

```
common_codes
  └─ code_key (예: M_PMP080301)
        │
        ▼
  equipment_catalog
    ├─ equipment_type = code_key
    ├─ model_file_id ──────────────┐
    ├─ rfa_file_id ────────────────┤
    └─ thumbnail_id ───────────────┤
                                   ▼
                            equipment_files
                              ├─ file_id
                              ├─ file_path  ← MinIO 경로
                              ├─ file_type
                              └─ file_category
                                   │
                                   ▼
                            MinIO: wai-equipment-files
                              └─ {file_id}/{파일명}
```

### 보조 테이블

| 테이블 | 용도 |
|--------|------|
| `minio_file_uploads` | 업로드 이력 추적. `record_id`(UUID)로 조인. 타입 캐스트 필요: `record_id = equipment_id::text` → **오류 발생**, `record_id::uuid = equipment_id` 사용 |
| `vendors` | `equipment_code`의 `VM_MONAS`, `VM_DD_ENG` 등 벤더 코드와 연결 |
| `multilingual_terms` | 다국어 명칭. `term_key`로 조회. 현재 장비 코드 매핑 데이터 없음 |

---

## 4. 장비 코드 체계 (common_codes)

### 펌프 계층 구조

```
EQUIP
└─ M_PUMP (펌프)
   ├─ M_PMP01 : 활성 슬러지 펌프
   ├─ M_PMP02 : 원심펌프
   │   ├─ M_PMP0201 : 축류펌프
   │   ├─ M_PMP0202 : 원심하수펌프
   │   ├─ M_PMP0203 : 반경류형펌프
   │   ├─ M_PMP0204 : 육상원심펌프
   │   └─ M_PMP0205 : 인라인펌프
   ├─ M_PMP03 : 수중모터펌프
   │   ├─ M_PMP0301 : 수중모터펌프
   │   ├─ M_PMP0302 : 수중오수모터펌프(자동탈착식)
   │   └─ M_PMP0303 : 수중오수모터펌프(VVVF)
   ├─ M_PMP04 : 약품펌프
   ├─ M_PMP05 : 양수펌프
   ├─ M_PMP06 : 무폐쇄형 펌프
   │   ├─ M_PMP0601 : 스프르트펌프
   │   └─ M_PMP0602 : 스프르트펌프(VVVF)
   ├─ M_PMP07 : 용적형 펌프
   │   └─ M_PMP0701 : 왕복동펌프
   │       └─ M_PMP070101 : 다이아프램펌프
   ├─ M_PMP08 : 회전펌프
   │   ├─ M_PMP0801 : 기어펌프
   │   ├─ M_PMP0802 : 마그네틱 로터리 펌프
   │   └─ M_PMP0803 : 스크류펌프
   │       ├─ M_PMP080301 : 일축스크류(모노)펌프       ← 모노펌프
   │       └─ M_PMP080302 : 일축스크류(모노)펌프(VVVF) ← 모노펌프 VVVF
   ├─ M_PMP09 : 부스터펌프(VVVF)
   ├─ M_PMP10 : 전동기 직렬펌프
   ├─ M_PMP11 : 오수용펌프
   ├─ M_PMP12 : 슬러지펌프
   ├─ M_PMP13 : 배수펌프
   ├─ M_PMP14 : 진공펌프
   └─ M_PMP99 : 기타 펌프
```

### code_key 규칙

```
M_PMP 080301
│       │
│       └─ 세부 분류 번호 (2자리씩 계층 추가)
└─────── 대분류: M=기계, A=건축/토목, P=배관, E=전기
```

---

## 5. equipment_files 파일 경로 규칙

### file_path 구조

```
{bucket_name}/{file_id}/{파일명}

예: wai-equipment-files/c01fc983-8e77-4cc6-95d4-877f6eddb7f7/M_PMP080301.rfa
```

### 파일명 명명 규칙

```
{equipment_type}_{vendor_code}_{model_number}_{단위그룹코드}_{용량}.{확장자}

예: M_PMP080301_VM_MONAS_KA30_GC250_3.34.dtdx
    │            │          │    │     │
    │            │          │    │     └─ 용량 (m³/h 등)
    │            │          │    └─────── 단위 그룹 코드
    │            │          └──────────── 모델 번호
    │            └─────────────────────── 벤더 코드
    └──────────────────────────────────── 장비 타입 코드
```

---

## 6. 파일 유형 정의

| `file_category` | `file_type` | 설명 | 비고 |
|-----------------|-------------|------|------|
| `3D_MODEL` | `dtdx` | 3D 모델 파일 (DataCube/DTDX 포맷) | 모델별 1개 |
| `RFA_FAMILY` | `rfa` | Revit 패밀리 파일 | 장비 타입당 1개 공용 |
| `THUMBNAIL` | `png` | 썸네일 이미지 | 일부 모델만 존재 |
| `CATALOG` | `pdf` | 제품 카탈로그 | wai-equipment-catalog 버킷 |

### MinIO 버킷별 파일 성격

| 버킷 | 주요 파일 유형 | 설명 |
|------|--------------|------|
| `wai-equipment-files` | dtdx, rfa, png | 장비 3D 모델, Revit 패밀리, 썸네일 |
| `wai-equipment-catalog` | pdf, 이미지 | 제품 카탈로그 문서 |
| `wai-3d-models` | 3D 모델 파일 | 프로젝트 배치용 3D 모델 |
| `wai-3d-library` | 라이브러리 파일 | `3d_library` 테이블과 연결 |
| `wai-drawing-files` | 도면 파일 | `drawing_files` 테이블과 연결 |

---

## 7. 벤더 코드 규칙

`equipment_code`의 `VM_XXX` 부분이 벤더 코드다.

| 벤더 코드 | 벤더명 (추정) | 모노펌프 모델 |
|----------|-------------|-------------|
| `VM_MONAS` | 모나스 (MONAS) | KA15~KA150 시리즈 |
| `VM_DD_ENG` | 대두엔지니어링 (DD Engineering) | DS-8-3~DS-150 시리즈 |

> 벤더 전체 목록은 `vendors` 테이블에서 확인:
> ```sql
> SELECT vendor_id, vendor_name, vendor_code FROM bkt_wai_design.vendors ORDER BY vendor_code;
> ```

---

## 8. 자주 쓰는 조회 쿼리 패턴

### 패턴 A — 장비명으로 전체 파일 목록 한번에 조회

```sql
SELECT
    ec.equipment_type,
    ec.equipment_code,
    ec.model_number,
    ec.unit_system_code,
    ef.file_name,
    ef.file_path,
    ef.file_type,
    ef.file_category,
    ef.file_size
FROM bkt_wai_design.equipment_catalog ec
JOIN bkt_wai_design.equipment_files ef
    ON ef.file_id = ec.model_file_id
WHERE ec.equipment_type = 'M_PMP080301'  -- 조회할 장비 코드
ORDER BY ec.model_number, ef.file_category;
```

### 패턴 B — RFA 파일만 조회

```sql
SELECT
    ec.equipment_type,
    ef.file_name,
    ef.file_path,
    ef.file_size
FROM bkt_wai_design.equipment_catalog ec
JOIN bkt_wai_design.equipment_files ef
    ON ef.file_id = ec.rfa_file_id
WHERE ec.equipment_type = 'M_PMP080301'
  AND ec.rfa_file_id IS NOT NULL
LIMIT 1;  -- 공용 파일이므로 1개
```

### 패턴 C — 3D 파일 있는 모델만 조회

```sql
SELECT
    equipment_type,
    equipment_code,
    model_number,
    model_file_id,
    unit_system_code
FROM bkt_wai_design.equipment_catalog
WHERE equipment_type IN ('M_PMP080301', 'M_PMP080302')
  AND model_file_id IS NOT NULL
  AND unit_system_code = 'METRIC'   -- METRIC / USCS
ORDER BY model_number;
```

### 패턴 D — 장비 타입 계층 탐색

```sql
-- 특정 부모 코드 하위의 모든 장비 타입 조회
SELECT code_key, code_value, code_value_en, parent_key
FROM bkt_wai_design.common_codes
WHERE parent_key = 'M_PMP08'   -- 회전펌프 하위
ORDER BY code_key;
```

### 패턴 E — 파일 통계 (장비 타입별 파일 수)

```sql
SELECT
    ef.equipment_type,
    ef.file_category,
    COUNT(*) AS file_count,
    SUM(ef.file_size::numeric) AS total_size_mb
FROM bkt_wai_design.equipment_files ef
WHERE ef.equipment_type LIKE 'M_PMP%'
GROUP BY ef.equipment_type, ef.file_category
ORDER BY ef.equipment_type, ef.file_category;
```

---

## 9. 주의사항 및 알려진 특이점

| 항목 | 내용 |
|------|------|
| **USCS 단위계 미등록** | `USCS_` 접두사 장비 코드는 `model_file_id = NULL` — 3D 파일 없음 |
| **RFA 파일 공용** | 동일 `equipment_type`의 모든 모델이 RFA 1개 공유 (`rfa_file_id` 동일) |
| **VVVF 타입 RFA 없음** | `M_PMP080302`(VVVF)는 `rfa_file_id = NULL` — Revit 패밀리 미등록 |
| **MinIO 직접 검색 불가** | MinIO 파일명이 UUID 폴더 구조라 `list_objects`로 장비 탐색 불가 |
| **minio_file_uploads 조인** | `record_id`가 TEXT 타입이므로 조인 시 `record_id::uuid = equipment_id` 사용 (반대 방향 캐스트 시 오류) |
| **3d_library 카테고리** | MACHINE, INTERIOR, STRUCTURE 3종만 존재. 장비 타입 코드와 직접 연결 안 됨 |
| **dtdx 파일 크기** | 대부분 0.09~0.17 MB. MinIO read_object로 직접 읽기 가능 (10MB 제한 이내) |
