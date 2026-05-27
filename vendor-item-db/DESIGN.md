# 설계 결정 문서 (vendor-item-db)

이 문서는 개발 과정에서 내린 구조적 결정과 초기 설계의 오류를 정리합니다.
코드를 수정하기 전에 반드시 이 문서를 확인하여 구조가 꼬이지 않도록 합니다.

---

## 1. 기자재 (equipments) 테이블 구조

### 현재 컬럼 (equipment_name 제거 후)

| 컬럼 | 설명 | 필수 |
|------|------|------|
| `equipment_id` | UUID PK | - |
| `equipment_code` | 고유 식별 코드 (예: TR-1000KVA) | 필수 |
| `category_id` | → equipment_categories | 선택 |
| `model_name` | 제조사 제품명 (예: TM-1000) | 선택 |
| `manufacturer_model_no` | 제조사 모델번호 | 선택 |
| `specification` | 규격/사양 (예: 1000kVA 22.9kV/380V) | 선택 |
| `unit` | 단위 (EA, M, SET 등) | 선택 |
| `gwd_equipment_id` | GWD 시스템 연동 ID | 선택 |
| `notes` | 비고 | 선택 |
| `is_active` | 활성 여부 | - |

### 제거된 컬럼

- **`equipment_name`** (제거 이유: 분류명과 중복)
  - 기존: "몰드변압기 1000kVA" — 분류(몰드변압기) + 사양(1000kVA) 조합에 불과했음
  - 기자재는 **분류(category) + 모델명(model_name) + 규격(specification)** 으로 충분히 식별됨
  - UI 표시 시 대표값 우선순위: `model_name` → `equipment_code`

---

## 2. 기자재-업체 관계 (vendor_items)

### DB 구조 (물리)
```
equipments 1 ─── N vendor_items N ─── 1 vendors
```
`vendor_items`는 `@@unique([vendor_id, equipment_id])` — 같은 (업체, 기자재) 쌍은 1개만 존재.

### 실제 사용 방식 (업무)
- **기자재 1개 = 공급 업체 1개** (1:1 매핑)
- 특정 모델 코드는 특정 제조사/공급사 하나에 귀속됨
- DB가 1:N을 허용하는 것은 기술적 구조이지, 업무 규칙이 아님

### ❌ 초기 오해 (수정됨)
- 기자재 Excel 업로드 시 "1:N이니까 같은 코드로 여러 행 입력" → **잘못된 설계**
- 올바른 방식: 기자재코드 1개 + 업체코드 1개 → `vendor_items` 1건 생성/연결

---

## 3. Excel 업로드 열 구성

### 기자재 업로드 (equipment_upload_actions.ts)

| 열 | 필드 | 필수 |
|----|------|------|
| A | 기자재코드 | 필수 |
| B | 모델명 | 선택 |
| C | 제조사모델번호 | 선택 |
| D | 규격/사양 | 선택 |
| E | 단위 | 선택 |
| F | 분류코드 | 선택 (equipment_categories.category_code 값) |
| G | 업체코드 | 선택 (vendors.vendor_code 값, 입력 시 vendor_item 생성) |
| H | 비고 | 선택 |

업로드 동작:
- 기자재코드 기준 upsert (코드 존재 시 update, 없으면 create)
- G열 업체코드 입력 시: vendor_items 레코드 생성 (이미 존재하면 skip)
- 분류코드 오류 / 업체코드 오류 → 해당 행 건너뛰고 오류 목록에 기록

### 업체 업로드 (vendor_upload_actions.ts)
별도 관리, 변경 없음.

---

## 4. UI 표시 규칙

- 기자재 대표명 표시: `model_name ?? equipment_code`
- 검색 대상 필드: `equipment_code`, `model_name`, `manufacturer_model_no`, `specification`
- 기자재 목록 정렬 기본값: `model_name` (없으면 `equipment_code`)

---

## 5. 참조 데이터 관리 (admin/references)

`vendor_types`, `countries` 테이블은 DB에서 관리하며 `/admin/references` 페이지에서 편집.
업체 등록/수정 폼의 드롭다운에서 이 데이터를 사용.

---

## 6. 개발 환경 주의사항

- **운영 서버**: `npm run build && npm start` (production mode 필수)
- 개발 서버(Turbopack)는 네트워크 접속 시 WebSocket HMR 연결 실패 → React 이벤트 미연결 → 버튼 무응답
- 코드 변경 후 반드시 `npm run build` 실행 후 서버 재시작

### Server Action 패턴 (이 Next.js 버전)
- Client 컴포넌트에서 server action을 **직접 import** (props로 전달 금지)
- 토글/삭제는 `<form action={serverAction}>` 직접 사용
- 폼 결과 처리: `if (state.ok) onSuccess()` — render에서 직접 호출 (useEffect 사용 금지)
