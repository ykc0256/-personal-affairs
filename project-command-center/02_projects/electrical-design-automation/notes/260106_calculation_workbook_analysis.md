# 260106 전기계산서 샘플 분석

분석 대상: `C:\Users\USER\desktop\260106_전기계산서(최종샘플).xlsx`

## Workbook Summary

- 시트 수: 31개
- 핵심 입력 시트: `초기 데이터`, `계측기리스트`, `전기 설계 UIUX(성과품X)`
- 핵심 산출 시트: `동력설비 부하계산서`, `부하일람표`, `동력설비 리스트`, `LOP 면수 산출서`, `SBR IO MCC`, `SBR IO 계측제어`, `IO 집계표`, 케이블 스케줄 3종, 케이블 트레이 계산 산출서 2종
- 룩업/기준정보 시트: `(참조)`로 시작하는 전선, 차단기, MC, EOCR, 인버터, 콘덴서, 소프트스타터, MCC 사이즈, 전선관 관련 시트

## Main Data Flow

```text
초기 데이터
  -> 동력설비 부하계산서
  -> 부하일람표
  -> 동력설비 리스트
  -> SBR IO MCC
  -> 케이블스케쥴(동력)
  -> 케이블스케쥴(제어)
  -> 배전반(전선&차단기) (성과품 X)

계측기리스트
  -> SBR IO 계측제어
  -> 케이블스케쥴(계측)

SBR IO MCC + SBR IO 계측제어
  -> IO 집계표
```

## Input Model

### Equipment

`초기 데이터`의 주요 컬럼:

- 기기번호
- 기기명
- 사양
- 동력(kW)
- 상용 수량
- 예비 수량
- 총 수량

이 시트는 자동화 프로그램의 기기 원장처럼 보이지만, 실제 프로그램 구조에서는 공정 설계와 기계 카탈로그 선택 결과를 전기계산서용으로 정규화한 중간 데이터로 보는 것이 적절하다. `동력설비 부하계산서`는 이 원장을 참조해 효율, 역률, 전압, 기동방식, 수용율 등을 붙이고 전류와 부하를 계산한다.

기계 카탈로그(`카탈로그_기계_v1.5.0.xlsx`)에는 장비별 동력(kW), 기동방식, 정격전압, 효율, 역률, 수용율이 포함되어 있다. 따라서 전기계산서의 초기 입력값은 수기 입력보다는 카탈로그 기반 자동 생성값으로 취급해야 한다.

### Instrument

`계측기리스트`는 계측기명, 설치위치, 측정대상물질, 수량, 전선, PLC 전선, 전선외경, 비고를 포함한다. 계측 제어 IO와 계측 케이블 스케줄 산출의 입력 원장으로 볼 수 있다.

## Calculation Rules Observed

- 부하용량(kVA): `동력(kW) / (효율 * 역률)`을 반올림
- 정격전류(A): `동력(kW) * 1000 / 1.732 / 380 / 효율 / 역률`
- 상용전류(A): `정격전류 * 상용수량`
- MCC 대표 상용전류: 구간 합계에 최대 부하의 10% 여유를 더함
- 상용동력/상용부하: 기기별 동력/부하에 상용수량을 곱함
- 수용동력/수용부하: 상용동력/상용부하에 수용율을 곱함
- 조작반 구분: 기동방식이 `MOP`이면 `MOP`, 그 외는 `LOP`
- 전선/접지선/차단기/제어기기류: 참조 시트의 구간 매칭 또는 코드 매칭으로 선정
- 전선관: 케이블 외경 기반 단면적 계산 후 `(참조) 전선관`에서 상위 규격 선정
- IO 집계: MCC IO와 계측제어 IO를 합산한 뒤 20% 여유를 적용하고 카드 수량을 산출

## Reference Tables

자동화 프로그램에서는 아래 참조 시트를 DB 테이블 또는 JSON/YAML 기준정보로 분리하는 것이 적절하다.

- `(참조) CV 및 GV`: 상용전류 기준 CV/GV 선정
- `(참조) PLC 전선`: 동력 기기 코드별 PLC 전선/신호/케이블 기준
- `(참조) 전선외경`: 전선 규격별 외경
- `(참조) 차단기`: 상용전류 기준 차단기 선정
- `(참조) MC`, `(참조) EOCR`, `(참조) 인버터`, `(참조) 콘덴서`, `(참조) 소프트스타터`: 기동방식/동력 기준 제어기기 선정
- `(참조) MCC 사이즈`: 동력 기준 MCC 사이즈 선정
- `(참조) 전선 및 PLC 전선`: 계측기 코드별 전선/PLC 전선 기준
- `(참조) 전선관`: 단면적 기준 전선관 선정

## Automation Design Implications

이 엑셀은 단일 계산서라기보다 입력 원장, 기준정보, 산출물 템플릿이 한 파일에 결합된 구조다. 프로그램화할 때는 다음 경계로 나누는 것이 좋다.

1. 입력 원장
   - Process design result
   - Mechanical catalog selection
   - Equipment list generated from catalog
   - Instrument list
   - Project/UI settings

2. 기준정보
   - Cable sizing
   - Cable outer diameter
   - Breaker/MC/EOCR/Inverter/Capacitor/Soft starter selection
   - PLC signal and cable code tables
   - Conduit sizing

3. 계산 엔진
   - Load calculation
   - MCC grouping
   - Power equipment list generation
   - IO generation and aggregation
   - Cable schedule generation
   - Conduit and tray sizing

4. 출력 템플릿
   - Excel deliverables
   - PDF/print area deliverables
   - Review sheets marked as `성과품 X`

## Risks And Cleanup Points

- 일부 참조 시트의 dimension이 `A1:N580933`, `A1:K580879`처럼 과도하게 크다. 실제 데이터보다 스타일 또는 사용 범위가 크게 잡힌 것으로 보이며, 프로그램에서 읽을 때 빈 행 스캔을 피해야 한다.
- `케이블 트레이 계산 산출서` 계열은 사용 컬럼이 `XEM`, `XDZ`까지 잡혀 있어 전체 워크시트 순회 방식은 매우 느리다.
- 일부 산출 시트는 특정 행 번호를 직접 참조한다. 기기 수가 달라지면 행 삽입/삭제에 취약하므로, 프로그램에서는 리스트 기반 생성으로 바꾸는 것이 좋다.
- `성과품 X` 시트는 내부 검토/보조 산출물로 분리해서 최종 제출물 생성 대상에서 제외해야 한다.
- 참조 시트가 중복되어 있다. 예: `(참조) PLC 전선`, `(참조) PLC 전선 (2)`, `(참조) 전선외경`, `(참조) 전선외경 (2)`.
