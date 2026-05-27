from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from PIL import Image, ImageDraw, ImageFont
import html
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "03_deliverables" / "electrical_design_explainer"
PNG_DIR = OUT_DIR / "png"
PPTX_PATH = OUT_DIR / "전기설계_자동화_흐름_설명자료_v0.1.pptx"
SUMMARY_PATH = OUT_DIR / "전기설계_자동화_흐름_설명자료_목차.md"

W, H = 1920, 1080
FONT = Path(r"C:\Windows\Fonts\malgun.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


COLORS = {
    "bg": "#F7F8FA",
    "ink": "#17202A",
    "muted": "#5D6778",
    "line": "#D7DDE6",
    "blue": "#1F5EFF",
    "navy": "#183153",
    "green": "#118C6A",
    "teal": "#0E7C86",
    "orange": "#E36B2C",
    "red": "#C83F49",
    "purple": "#6A4BBC",
    "card": "#FFFFFF",
    "soft_blue": "#EAF0FF",
    "soft_green": "#EAF7F1",
    "soft_orange": "#FFF1E8",
    "soft_gray": "#EEF2F6",
}


def draw_round_rect(draw, box, radius=18, fill="#FFFFFF", outline=None, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(draw, text, fnt, max_width):
    lines = []
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        words = para.split(" ")
        line = ""
        for word in words:
            test = word if not line else f"{line} {word}"
            if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    return lines


def text(draw, xy, value, size=34, color=None, bold=False, max_width=None, line_gap=10, anchor=None):
    fnt = font(size, bold)
    color = color or COLORS["ink"]
    x, y = xy
    if max_width:
        lines = wrap_text(draw, value, fnt, max_width)
        for line in lines:
            draw.text((x, y), line, font=fnt, fill=color)
            y += size + line_gap
        return y
    draw.text((x, y), value, font=fnt, fill=color, anchor=anchor)
    return y + size


def bullet_list(draw, xy, items, size=31, color=None, max_width=650, gap=20):
    x, y = xy
    color = color or COLORS["ink"]
    fnt = font(size)
    for item in items:
        draw.ellipse((x, y + 12, x + 12, y + 24), fill=COLORS["blue"])
        lines = wrap_text(draw, item, fnt, max_width)
        yy = y
        for line in lines:
            draw.text((x + 28, yy), line, font=fnt, fill=color)
            yy += size + 8
        y = yy + gap
    return y


def arrow(draw, start, end, color="#1F5EFF", width=5):
    draw.line((start, end), fill=color, width=width)
    x1, y1 = start
    x2, y2 = end
    # simple horizontal/vertical arrow head
    if abs(x2 - x1) >= abs(y2 - y1):
        sign = 1 if x2 >= x1 else -1
        pts = [(x2, y2), (x2 - sign * 20, y2 - 12), (x2 - sign * 20, y2 + 12)]
    else:
        sign = 1 if y2 >= y1 else -1
        pts = [(x2, y2), (x2 - 12, y2 - sign * 20), (x2 + 12, y2 - sign * 20)]
    draw.polygon(pts, fill=color)


def base_slide(title, subtitle=None, section=None):
    img = Image.new("RGB", (W, H), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 12), fill=COLORS["blue"])
    if section:
        draw_round_rect(draw, (86, 54, 250, 104), 16, fill=COLORS["soft_blue"])
        text(draw, (112, 65), section, 24, COLORS["blue"], bold=True)
    text(draw, (92, 136), title, 54, COLORS["ink"], bold=True)
    if subtitle:
        text(draw, (96, 210), subtitle, 30, COLORS["muted"], max_width=1450)
    draw.line((92, 282, 1828, 282), fill=COLORS["line"], width=2)
    return img, draw


def card(draw, x, y, w, h, title, body=None, accent="#1F5EFF", fill="#FFFFFF", title_size=34, body_size=27):
    draw_round_rect(draw, (x, y, x + w, y + h), 18, fill=fill, outline=COLORS["line"], width=2)
    draw.rectangle((x, y, x + 10, y + h), fill=accent)
    text(draw, (x + 34, y + 26), title, title_size, COLORS["ink"], bold=True, max_width=w - 60)
    if body:
        text(draw, (x + 34, y + 86), body, body_size, COLORS["muted"], max_width=w - 70, line_gap=8)


def flow_box(draw, x, y, w, h, title, subtitle, color):
    draw_round_rect(draw, (x, y, x + w, y + h), 18, fill="#FFFFFF", outline=color, width=3)
    text(draw, (x + 28, y + 26), title, 31, COLORS["ink"], bold=True, max_width=w - 56)
    text(draw, (x + 28, y + 76), subtitle, 23, COLORS["muted"], max_width=w - 56, line_gap=6)


def slide_01():
    img = Image.new("RGB", (W, H), "#F3F6FB")
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 18), fill=COLORS["blue"])
    text(draw, (120, 150), "전기설계 자동화 흐름 설명자료", 72, COLORS["ink"], bold=True)
    text(draw, (124, 252), "국내 기준 기반 전기계산서, 기준정보, 도면·성과품 생성 흐름", 36, COLORS["muted"], max_width=1260)
    draw_round_rect(draw, (118, 390, 1800, 760), 28, fill="#FFFFFF", outline=COLORS["line"], width=2)
    bullet_list(draw, (170, 450), [
        "기기/계측 입력 데이터에서 전기 용량계산서와 부하일람표를 산출",
        "KEC, KS/IEC, 제조사 카탈로그, 사내 기준을 기준정보로 분리",
        "전선·차단기·전선관·Tray·IO 산출을 거쳐 최종 도면과 계산서를 생성",
    ], size=34, max_width=1500, gap=28)
    text(draw, (124, 920), "v0.1 | electrical-design-deliverables", 28, COLORS["muted"])
    return img


def slide_02():
    img, draw = base_slide("전체 전기설계 자동화 흐름", "공정 설계와 카탈로그 선택값을 기준으로 계산·도면·성과품을 자동 생성합니다.", "FLOW")
    xs = [100, 420, 740, 1060, 1380]
    titles = ["공정 설계", "카탈로그", "계산 엔진", "도면/3D 연계", "최종 성과품"]
    subs = [
        "공정 구성\n시설용량\n상용/예비 수량",
        "장비 모델 선택\n동력·기동방식\n전압·효율·역률",
        "부하 계산\n전선·차단기 선정\nIO·케이블 산출",
        "MCC/Panel 배치\nTray 경로\nSVG/DXF 도면",
        "용량계산서\n부하일람표\n도면·케이블표",
    ]
    cols = [COLORS["blue"], COLORS["green"], COLORS["orange"], COLORS["purple"], COLORS["navy"]]
    for i, x in enumerate(xs):
        flow_box(draw, x, 395, 250, 250, titles[i], subs[i], cols[i])
        if i < len(xs) - 1:
            arrow(draw, (x + 250, 520), (xs[i + 1] - 28, 520), COLORS["blue"], 5)
    text(draw, (120, 760), "핵심 원칙", 40, COLORS["ink"], bold=True)
    bullet_list(draw, (125, 830), [
        "전기 입력값은 기계 카탈로그 선택 결과에서 자동 생성됩니다.",
        "KEC/KS/제조사/사내 기준은 프로그램 기준정보 테이블로 분리합니다.",
        "도면은 계산 결과를 표현하는 출력물이며, 수동 편집과 데이터 동기화 정책이 필요합니다.",
    ], size=31, max_width=1550, gap=20)
    return img


def slide_03():
    img, draw = base_slide("입력 데이터와 기준정보", "공정 설계 결과와 기계 카탈로그 선택값이 전기설계용 기기 리스트로 정규화됩니다.", "INPUT")
    card(draw, 110, 360, 510, 430, "공정 설계 결과", "처리공정 구성\n시설용량/설계조건\n공정별 필요 장비\n상용/예비 수량", COLORS["blue"], COLORS["soft_blue"])
    card(draw, 705, 360, 510, 430, "기계 카탈로그", "장비코드/장비유형\n공급업체/모델\n동력(kW)\n기동방식\n정격전압·효율·역률·수용율", COLORS["green"], COLORS["soft_green"])
    card(draw, 1300, 360, 510, 430, "전기 기준정보", "전선 허용전류\n차단기/제어기기\nPLC 신호\n전선관/Tray\nKEC·KS·제조사·사내 기준", COLORS["orange"], COLORS["soft_orange"])
    arrow(draw, (620, 575), (685, 575), COLORS["blue"])
    arrow(draw, (1215, 575), (1280, 575), COLORS["blue"])
    text(draw, (130, 870), "자동화 기준", 36, COLORS["ink"], bold=True)
    text(draw, (130, 925), "카탈로그 선택 결과를 전기계산서 `초기 데이터` 형태로 변환하고, 이후 전기 기준정보를 적용해 계산합니다.", 30, COLORS["muted"], max_width=1600)
    return img


def slide_04():
    img, draw = base_slide("부하 계산 및 MCC 그룹 산출", "카탈로그에서 내려온 기계 동력과 공정 설계 수량을 기준으로 전기 용량계산서와 부하일람표가 생성됩니다.", "CALC")
    flow_box(draw, 120, 380, 300, 190, "카탈로그 입력", "동력(kW)\n기동방식\n전압·효율·역률", COLORS["blue"])
    flow_box(draw, 505, 380, 300, 190, "부하 계산", "효율, 역률, 전압\nkVA, 정격전류\n상용전류", COLORS["green"])
    flow_box(draw, 890, 380, 300, 190, "MCC 집계", "그룹별 상용전류\n최대부하 여유\n수용율 적용", COLORS["orange"])
    flow_box(draw, 1275, 380, 300, 190, "부하일람표", "상용동력\n상용부하\n수용부하", COLORS["purple"])
    for x in [420, 805, 1190]:
        arrow(draw, (x, 475), (x + 65, 475), COLORS["blue"])
    card(draw, 130, 690, 770, 250, "적용 기준", "KEC 저압 전기설비, 설계전류 산정, 수용율/여유율 사내 기준, MCC 한계전류 프로젝트 기준", COLORS["navy"])
    card(draw, 1020, 690, 770, 250, "계산서 대응 시트", "`초기 데이터`는 공정 설계와 기계 카탈로그 선택 결과를 정규화한 중간 데이터입니다.", COLORS["teal"])
    return img


def slide_05():
    img, draw = base_slide("전선·접지선·차단기 선정", "전류 계산 결과를 기준으로 전선, 보호도체, 차단기를 선정합니다.", "WIRE")
    card(draw, 110, 350, 500, 500, "전선 선정", "CV/F-CV 규격\n포설 방식\n주위온도 보정\n다회로 보정\n전압강하 검토", COLORS["blue"], COLORS["soft_blue"])
    card(draw, 710, 350, 500, 500, "접지선/보호도체", "GV/PE 단면적\n선도체 단면적 기준\n단락 열적내량\nKEC 142.3 계열", COLORS["green"], COLORS["soft_green"])
    card(draw, 1310, 350, 500, 500, "차단기 선정", "정격전류\n극수/전압\n차단용량(kA)\n전선 보호 조건\n제조사 모델", COLORS["orange"], COLORS["soft_orange"])
    text(draw, (120, 920), "주요 Reference: KEC, KS C IEC 60364-5-52, KS C IEC 60364-5-54, 차단기 제조사 카탈로그", 30, COLORS["muted"], max_width=1650)
    return img


def slide_06():
    img, draw = base_slide("기동방식별 제어기기 선정", "기동방식과 전동기 용량에 따라 MCC Unit 구성요소가 달라집니다.", "MCC")
    cols = [
        ("직입", "MC\nEOCR\n콘덴서\nCV/CVV 제어선", COLORS["blue"]),
        ("인버터", "인버터 모델\n전원/제어 케이블\n통신 옵션\nBypass 여부", COLORS["green"]),
        ("소프트스타터", "Soft starter 모델\n정격전류\n기동 조건\n보호기기", COLORS["orange"]),
        ("MOP/LOP", "현장 조작반\nMCC/LOP 구분\n제어 신호\nPanel 연계", COLORS["purple"]),
    ]
    x = 115
    for title, body, col in cols:
        card(draw, x, 360, 390, 410, title, body, col)
        x += 450
    card(draw, 160, 835, 1600, 130, "기준", "제어기기 선정은 KEC보다 제조사 카탈로그와 사내 표준의 영향이 큽니다. 자동화 프로그램에는 제조사, 시리즈, 모델, 적용 용량/전류 범위, 옵션 조건을 기준정보로 저장해야 합니다.", COLORS["navy"])
    return img


def slide_07():
    img, draw = base_slide("PLC / 계측 IO 및 케이블 산출", "기기와 계측기 타입별 신호를 표준화해 IO 집계와 제어 케이블을 산출합니다.", "I/O")
    flow_box(draw, 110, 385, 300, 205, "기기/계측 태그", "기기번호\n계측기 태그\n수량", COLORS["blue"])
    flow_box(draw, 500, 385, 300, 205, "신호 기준", "DI / DO\nAI / AO\nRS-485 / Ethernet", COLORS["green"])
    flow_box(draw, 890, 385, 300, 205, "케이블 선정", "CVV\nCVV-SB\n차폐/비차폐", COLORS["orange"])
    flow_box(draw, 1280, 385, 300, 205, "IO 집계", "Actual\nInstall 20%\nCard 수량", COLORS["purple"])
    for x in [410, 800, 1190]:
        arrow(draw, (x, 490), (x + 70, 490), COLORS["blue"])
    card(draw, 140, 720, 760, 230, "계산서 대응 시트", "`동력설비 리스트`, `계측기리스트`, `SBR IO MCC`, `SBR IO 계측제어`, `IO 집계표`", COLORS["teal"])
    card(draw, 1020, 720, 760, 230, "기준", "PLC I/O 설계 기준, 계측기 사양, 사내 제어 표준, 제어/계측 케이블 제조사 카탈로그", COLORS["navy"])
    return img


def slide_08():
    img, draw = base_slide("전선관·Tray·3D 배치 연계", "케이블 외경과 경로 정보를 기반으로 전선관, Tray, 3D 배치, 물량 산출을 연결합니다.", "TRAY")
    flow_box(draw, 120, 360, 290, 200, "케이블 스케줄", "From-To\n전선 규격\n외경", COLORS["blue"])
    flow_box(draw, 485, 360, 290, 200, "전선관 산정", "외경 단면적\n점유율\n전선관 규격", COLORS["green"])
    flow_box(draw, 850, 360, 290, 200, "Tray 산정", "케이블 합계\n분리 기준\n폭/높이", COLORS["orange"])
    flow_box(draw, 1215, 360, 290, 200, "3D 배치", "전기실 Panel\nTrayH/TrayV\n경로 설정", COLORS["purple"])
    flow_box(draw, 1580, 360, 230, 200, "물량", "길이\n수량\n내역", COLORS["navy"])
    for x in [410, 775, 1140, 1505]:
        arrow(draw, (x, 460), (x + 55, 460), COLORS["blue"])
    card(draw, 140, 700, 780, 250, "적용 기준", "KEC 배선설비, KS C IEC 60364-5-52, KS C IEC 61537-A, 전선관/Tray 제조사 규격, 발주처/사내 점유율 기준", COLORS["navy"])
    card(draw, 1020, 700, 780, 250, "계산서 대응 시트", "`케이블스케쥴(동력/제어/계측)`, `(참조) 전선관`, `케이블 트레이 계산 산출서(전기실/전기실 제외)`", COLORS["teal"])
    return img


def slide_09():
    img, draw = base_slide("2D 도면 생성 흐름", "계산 결과와 3D 배치 결과를 도면 데이터로 변환해 SVG/PDF/DXF 성과품을 생성합니다.", "DRAWING")
    rows = [
        ("부하일람표 도면", "전기 용량계산서의 부하일람표를 도면 표 형식으로 변환"),
        ("수변전 단선결선도", "수변전설비, 고압반, 저압반, 분전반 모듈 자동 배치"),
        ("MCC 단선결선도", "기동방식별 모듈, Tag Number, 기기명 자동 기입"),
        ("MCC 구성도", "MCC Unit 슬롯, 외함 규격, 3D 전기실 배치와 연계"),
        ("전기 평면도", "Panel, Tray, 전선관, 케이블 경로를 2D로 산출"),
        ("케이블 스케줄 도면", "From-To, 전선, 접지선, 전선관, 비고를 표로 출력"),
    ]
    y = 340
    for i, (t, b) in enumerate(rows):
        x = 120 if i % 2 == 0 else 1010
        if i % 2 == 0 and i > 0:
            y += 180
        card(draw, x, y, 780, 135, t, b, COLORS["blue"] if i % 2 == 0 else COLORS["green"], title_size=30, body_size=24)
    text(draw, (124, 965), "출력 포맷: SVG 편집 화면 -> PDF / DXF 저장, Excel 표 산출물 병행", 29, COLORS["muted"], max_width=1600)
    return img


def slide_10():
    img, draw = base_slide("최종 성과품: 용량계산서", "Excel 계산서 샘플은 카탈로그 기반 입력을 전기계산 산출물로 변환하는 템플릿 원형입니다.", "OUTPUT")
    groups = [
        ("입력/원장", "공정 설계 결과\n기계 카탈로그 선택\n초기 데이터\n계측기리스트"),
        ("계산", "동력설비 부하계산서\n부하일람표\n동력설비 리스트"),
        ("IO", "SBR IO MCC\nSBR IO 계측제어\nIO 집계표"),
        ("케이블", "케이블스케쥴(동력)\n케이블스케쥴(제어)\n케이블스케쥴(계측)"),
        ("Tray/보조", "케이블 트레이 계산\n배전반 전선&차단기\n성과품 X 검토 시트"),
    ]
    x = 100
    for title, body in groups:
        card(draw, x, 360, 330, 420, title, body, COLORS["blue"], "#FFFFFF", title_size=32, body_size=26)
        x += 360
    text(draw, (125, 865), "관리 원칙", 36, COLORS["ink"], bold=True)
    bullet_list(draw, (130, 925), [
        "원본 Excel 수식은 검증 기준으로 보존하고, 프로그램에서는 계산 로직과 기준정보를 분리합니다.",
        "성과품 시트와 내부 검토용 `성과품 X` 시트를 명확히 구분합니다.",
    ], size=28, max_width=1600, gap=12)
    return img


def slide_11():
    img, draw = base_slide("최종 성과품: 도면과 내역", "계산 결과는 도면, 물량, 내역서로 확장됩니다.", "OUTPUT")
    card(draw, 110, 360, 500, 430, "도면 성과품", "부하일람표 도면\n단선결선도\nMCC 구성도\n전기 평면도\n케이블 스케줄 도면", COLORS["blue"], COLORS["soft_blue"])
    card(draw, 710, 360, 500, 430, "물량 성과품", "고압반/저압반/MCC\n동력·제어·계측 케이블\n전선관\nTray\n접지 자재", COLORS["green"], COLORS["soft_green"])
    card(draw, 1310, 360, 500, 430, "제출 포맷", "Excel\nPDF\nDXF\nSVG\n프로젝트 DB", COLORS["orange"], COLORS["soft_orange"])
    text(draw, (126, 875), "핵심 연결", 36, COLORS["ink"], bold=True)
    text(draw, (126, 930), "전기 용량계산 데이터가 도면과 물량의 근거가 되므로, 모든 산출물은 동일한 기준정보 버전과 프로젝트 입력값을 공유해야 합니다.", 30, COLORS["muted"], max_width=1600)
    return img


def slide_12():
    img, draw = base_slide("수량산출 및 내역서 생성 흐름", "전기계산 결과와 3D Tray 배치 결과를 품목별 수량으로 집계한 뒤 내역서 양식에 반영합니다.", "EST")
    flow_box(draw, 100, 365, 285, 205, "전기계산 결과", "동력설비 리스트\n계측기 리스트\n케이블 스케줄", COLORS["blue"])
    flow_box(draw, 455, 365, 285, 205, "3D 결과", "Tray 코드\nTray 수량\n경로/길이", COLORS["purple"])
    flow_box(draw, 810, 365, 285, 205, "수량산출", "전선\n전선관\nLOP/MCC\n계측기", COLORS["orange"])
    flow_box(draw, 1165, 365, 285, 205, "카탈로그 매칭", "품명\n규격\n단위\n단가", COLORS["green"])
    flow_box(draw, 1520, 365, 285, 205, "내역서", "기자재내역\n설치비\n일위대가", COLORS["navy"])
    for x in [385, 740, 1095, 1450]:
        arrow(draw, (x, 468), (x + 50, 468), COLORS["blue"])
    card(draw, 130, 700, 780, 230, "수량산출 파일", "`260401_전기 수량 산출_r3.xlsx`의 `3-1`~`3-5` 시트가 전선, 전선관, Tray, LOP, MCC 산출 결과를 담습니다.", COLORS["teal"])
    card(draw, 1020, 700, 780, 230, "내역서 양식", "`내역서(양식)_국문(Metric)_r11.xlsx`의 `6-1`~`6-4` 전기 시트에 기자재/설치비/일위대가가 반영됩니다.", COLORS["navy"])
    return img


def slide_13():
    img, draw = base_slide("전기·계측기 카탈로그와 내역서 항목", "내역서 생성의 핵심 키는 equipment_code이며, 카탈로그에서 품명·규격·단가·출처를 조회합니다.", "DB")
    card(draw, 110, 340, 520, 500, "전기 카탈로그", "전선\n전선관 및 부속품\n트레이 및 부속품\n차단기\n콘덴서\n배전제어기기\n기타 전기 품목", COLORS["blue"], COLORS["soft_blue"])
    card(draw, 700, 340, 520, 500, "계측기 카탈로그", "수위계\n유량계\npH / ORP / DO\n압력계\n온도계\nMLSS계\n공급업체/재질 코드", COLORS["green"], COLORS["soft_green"])
    card(draw, 1290, 340, 520, 500, "내역서 전기 파트", "6-1 기자재내역서\n6-2 설치비내역서\n6-3 일위대가목록\n6-4 일위대가\n총 공사비 연계", COLORS["orange"], COLORS["soft_orange"])
    text(draw, (126, 910), "관리 포인트", 36, COLORS["ink"], bold=True)
    text(draw, (126, 965), "단가출처, 사용여부, 카탈로그 버전, 수량 산출 기준을 함께 저장해야 내역서 산출 근거를 설명할 수 있습니다.", 30, COLORS["muted"], max_width=1600)
    return img


def slide_14():
    img, draw = base_slide("기준정보 관리와 검증", "전기설계 자동화의 신뢰성은 계산식보다 기준정보 관리에서 결정됩니다.", "GOV")
    card(draw, 120, 350, 520, 470, "기준 출처", "KEC\n전기설비기술기준\nKS C IEC 60364\nKS C IEC 61537\n제조사 카탈로그\n사내 설계 기준", COLORS["navy"])
    card(draw, 700, 350, 520, 470, "버전 관리", "문서명\n발행일/개정일\n적용 시작일\n검토자\n승인 상태\n프로젝트 예외", COLORS["green"])
    card(draw, 1280, 350, 520, 470, "검증 포인트", "전류/전선/차단기 정합\n접지선 단면적\n전선관 점유율\nTray 여유율\n도면-계산서 일치", COLORS["orange"])
    text(draw, (126, 910), "다음 단계: 참조표를 DB schema로 정의하고, Excel 샘플 산출물과 프로그램 계산 결과를 비교 검증합니다.", 30, COLORS["muted"], max_width=1600)
    return img


SLIDES = [
    ("01_title", slide_01),
    ("02_overall_flow", slide_02),
    ("03_input_reference", slide_03),
    ("04_load_calc", slide_04),
    ("05_wire_breaker", slide_05),
    ("06_mcc_control", slide_06),
    ("07_io_cable", slide_07),
    ("08_tray_3d", slide_08),
    ("09_drawings", slide_09),
    ("10_calc_workbook", slide_10),
    ("11_deliverables", slide_11),
    ("12_quantity_estimate", slide_12),
    ("13_catalog_estimate", slide_13),
    ("14_governance", slide_14),
]


def save_pngs():
    if PNG_DIR.exists():
        shutil.rmtree(PNG_DIR)
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    paths = []
    for idx, (name, maker) in enumerate(SLIDES, 1):
        img = maker()
        path = PNG_DIR / f"{idx:02d}_{name}.png"
        img.save(path)
        paths.append(path)
    return paths


def xml_escape(value):
    return html.escape(value, quote=True)


def write_pptx(image_paths):
    if PPTX_PATH.exists():
        PPTX_PATH.unlink()
    slide_w = 12192000
    slide_h = 6858000
    with ZipFile(PPTX_PATH, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types(len(image_paths)))
        z.writestr("_rels/.rels", root_rels())
        z.writestr("ppt/presentation.xml", presentation_xml(len(image_paths), slide_w, slide_h))
        z.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(len(image_paths)))
        z.writestr("ppt/theme/theme1.xml", theme_xml())
        z.writestr("ppt/slideMasters/slideMaster1.xml", slide_master_xml())
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", slide_master_rels())
        z.writestr("ppt/slideLayouts/slideLayout1.xml", slide_layout_xml())
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slide_layout_rels())
        z.writestr("ppt/viewProps.xml", view_props_xml())
        z.writestr("ppt/presProps.xml", pres_props_xml())
        z.writestr("ppt/tableStyles.xml", table_styles_xml())
        z.writestr("docProps/core.xml", core_props_xml())
        z.writestr("docProps/app.xml", app_props_xml(len(image_paths)))

        for idx, path in enumerate(image_paths, 1):
            z.write(path, f"ppt/media/image{idx}.png")
            z.writestr(f"ppt/slides/slide{idx}.xml", slide_xml(idx, slide_w, slide_h))
            z.writestr(f"ppt/slides/_rels/slide{idx}.xml.rels", slide_rels(idx))


def content_types(n):
    overrides = [
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
        '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>',
        '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>',
        '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    for i in range(1, n + 1):
        overrides.append(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>')
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
{''.join(overrides)}
</Types>'''


def root_rels():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def presentation_xml(n, slide_w, slide_h):
    sld_ids = ''.join(f'<p:sldId id="{255+i}" r:id="rId{i}"/>' for i in range(1, n + 1))
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId{n+1}"/></p:sldMasterIdLst>
<p:sldIdLst>{sld_ids}</p:sldIdLst>
<p:sldSz cx="{slide_w}" cy="{slide_h}" type="wide"/>
<p:notesSz cx="6858000" cy="9144000"/>
<p:defaultTextStyle/>
</p:presentation>'''


def presentation_rels(n):
    rels = ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>' for i in range(1, n + 1))
    rels += f'<Relationship Id="rId{n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    rels += f'<Relationship Id="rId{n+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}</Relationships>'''


def slide_xml(idx, slide_w, slide_h):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="Slide Image {idx}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{slide_w}" cy="{slide_h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''


def slide_rels(idx):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image{idx}.png"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''


def slide_master_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>'''


def slide_master_rels():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''


def slide_layout_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'''


def slide_layout_rels():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''


def theme_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
<a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F1F1F"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="1F5EFF"/></a:accent1><a:accent2><a:srgbClr val="118C6A"/></a:accent2><a:accent3><a:srgbClr val="E36B2C"/></a:accent3><a:accent4><a:srgbClr val="6A4BBC"/></a:accent4><a:accent5><a:srgbClr val="0E7C86"/></a:accent5><a:accent6><a:srgbClr val="183153"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/><a:cs typeface="Malgun Gothic"/></a:majorFont><a:minorFont><a:latin typeface="Malgun Gothic"/><a:ea typeface="Malgun Gothic"/><a:cs typeface="Malgun Gothic"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'''


def view_props_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:normalViewPr/><p:slideViewPr/><p:notesTextViewPr/><p:gridSpacing cx="72008" cy="72008"/></p:viewPr>'''


def pres_props_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'''


def table_styles_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>'''


def core_props_xml():
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>전기설계 자동화 흐름 설명자료</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2026-05-12T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-05-12T00:00:00Z</dcterms:modified></cp:coreProperties>'''


def app_props_xml(n):
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codex</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>{n}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides></Properties>'''


def write_summary():
    SUMMARY_PATH.write_text(
        """# 전기설계 자동화 흐름 설명자료 목차

산출물:

- `전기설계_자동화_흐름_설명자료_v0.1.pptx`
- `png/`: 슬라이드별 PNG 이미지

## 슬라이드 구성

1. 전기설계 자동화 흐름 설명자료
2. 전체 전기설계 자동화 흐름
3. 입력 데이터와 기준정보
4. 부하 계산 및 MCC 그룹 산출
5. 전선·접지선·차단기 선정
6. 기동방식별 제어기기 선정
7. PLC / 계측 IO 및 케이블 산출
8. 전선관·Tray·3D 배치 연계
9. 2D 도면 생성 흐름
10. 최종 성과품: 용량계산서
11. 최종 성과품: 도면과 내역
12. 수량산출 및 내역서 생성 흐름
13. 전기·계측기 카탈로그와 내역서 항목
14. 기준정보 관리와 검증

## 사용 목적

공정 설계와 기계 카탈로그 선택 결과에서 전기설계 입력값을 생성하고, 국내 기준 기반으로 전기계산/도면/성과품을 만드는 흐름을 설명하기 위한 초안입니다.
""",
        encoding="utf-8",
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    paths = save_pngs()
    write_pptx(paths)
    write_summary()
    print(PPTX_PATH)
    print(PNG_DIR)
    print(SUMMARY_PATH)


if __name__ == "__main__":
    main()
