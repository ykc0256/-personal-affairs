# 250619 Vendor시스템, WAI 관계 구분 정리

원본: `99_reference/vendor-item-db/originals/250619_Vendor시스템, WAI 관계 구분.pdf`

## 문서 성격

Vendor 시스템과 WAI Design/GWD 간 관계를 구분하기 위한 참고 PDF입니다.

## 추출 상태

PDF에서 텍스트 추출은 가능했지만 한글 텍스트 매핑 품질이 낮아 일부 내용이 깨져 보입니다. 따라서 이 문서는 원본 PDF를 기준 자료로 보관하고, 추출 가능한 키워드와 구조만 1차 정리합니다.

## 확인된 키워드

- Vendor 시스템
- WAI Design
- Vendor DB
- Vendor ID
- Item DB
- Item
- Vendor Item DB
- Code
- TAB 구분
- GWD 또는 WAI로 전달되는 데이터 흐름

## 1차 해석

| 구분 | 해석 |
| --- | --- |
| Vendor DB | 업체 기본 정보와 Vendor ID를 관리하는 영역 |
| Item DB | 아이템 기본 정보와 코드 체계를 관리하는 영역 |
| Vendor Item DB | 특정 업체가 취급하는 아이템, 단가, 대리점 관계를 연결하는 영역 |
| WAI/GWD 관계 | Vendor/Item 기준 데이터를 WAI 또는 GWD에서 활용할 수 있도록 전달하거나 연계하는 구조 |
| TAB 구분 | 시스템 화면 또는 데이터 관리 단위가 Vendor, Item, Vendor Item 등으로 나뉘는 것으로 추정 |

## 프로젝트 반영 사항

- Vendor DB, Item DB, Vendor Item DB를 분리해 설계합니다.
- Vendor와 Item은 다대다 관계로 보고, 중간 테이블에서 단가, 대리점, 파일, 평가 이력을 연결합니다.
- 원본 PDF의 화면/TAB 구분은 GWD 관리자 페이지 정보구조 설계 시 다시 확인합니다.

## 확인 필요

- PDF 원본을 열어 화면 구성 또는 표를 수동 확인해야 합니다.
- WAI와 GWD 중 어느 쪽이 원천 데이터를 생성하고 어느 쪽이 조회/관리하는지 확정해야 합니다.
- `to Vendor`, `to WAI`로 보이는 흐름의 정확한 의미를 확인해야 합니다.

