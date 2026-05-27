from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "03_deliverables" / "electrical_design_reference_report"
ASSET_DIR = OUT_DIR / "assets"
HTML_PATH = OUT_DIR / "전기설계_자동화_구조_및_레퍼런스_보고서_v0.1.html"
MD_PATH = OUT_DIR / "전기설계_자동화_구조_및_레퍼런스_보고서_v0.1.md"

W, H = 1600, 900
FONT = Path(r"C:\Windows\Fonts\malgun.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\malgunbd.ttf")

COL = {
    "bg": "#F6F8FB",
    "ink": "#17202A",
    "muted": "#5D6778",
    "line": "#D7DDE6",
    "blue": "#1F5EFF",
    "green": "#118C6A",
    "orange": "#E36B2C",
    "purple": "#6A4BBC",
    "navy": "#183153",
    "white": "#FFFFFF",
    "soft_blue": "#EAF0FF",
    "soft_green": "#EAF7F1",
    "soft_orange": "#FFF1E8",
    "soft_purple": "#F1ECFF",
    "soft_gray": "#EEF2F6",
}


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT), size)


def wrap(draw, value, fnt, max_width):
    lines = []
    for paragraph in value.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        line = ""
        for word in paragraph.split(" "):
            trial = word if not line else f"{line} {word}"
            if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
                line = trial
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    return lines


def draw_text(draw, xy, value, size=28, color=None, bold=False, max_width=None, gap=8):
    color = color or COL["ink"]
    fnt = font(size, bold)
    x, y = xy
    if max_width:
        for line in wrap(draw, value, fnt, max_width):
            draw.text((x, y), line, font=fnt, fill=color)
            y += size + gap
        return y
    draw.text((x, y), value, font=fnt, fill=color)
    return y + size


def round_box(draw, box, fill, outline, radius=18, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw, start, end, color=None, width=5):
    color = color or COL["blue"]
    draw.line((start, end), fill=color, width=width)
    x1, y1 = start
    x2, y2 = end
    direction = 1 if x2 >= x1 else -1
    draw.polygon([(x2, y2), (x2 - direction * 22, y2 - 13), (x2 - direction * 22, y2 + 13)], fill=color)


def base(title, subtitle):
    img = Image.new("RGB", (W, H), COL["bg"])
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 12), fill=COL["blue"])
    draw_text(draw, (70, 58), title, 46, bold=True)
    draw_text(draw, (72, 122), subtitle, 25, COL["muted"], max_width=1380)
    draw.line((70, 185, 1530, 185), fill=COL["line"], width=2)
    return img, draw


def box(draw, x, y, w, h, title, body, color, fill):
    round_box(draw, (x, y, x + w, y + h), fill=fill, outline=color, width=3)
    draw_text(draw, (x + 24, y + 24), title, 29, bold=True, max_width=w - 48)
    draw_text(draw, (x + 24, y + 78), body, 22, COL["muted"], max_width=w - 48, gap=7)


def save(img, name):
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    path = ASSET_DIR / name
    img.save(path)
    return name


def figure_01():
    img, draw = base("전기설계 자동화 전체 구조", "공정/카탈로그 입력에서 계산서, 도면, 수량산출서, 내역서까지 이어지는 성과품 흐름")
    steps = [
        ("공정 설계", "처리공정\n시설용량\n장비 수량", COL["blue"], COL["soft_blue"]),
        ("기계 카탈로그", "장비코드\n동력/기동방식\n전압/효율/극수", COL["green"], COL["soft_green"]),
        ("전기계산", "부하계산\n전선/차단기\nIO/케이블", COL["orange"], COL["soft_orange"]),
        ("도면/3D", "MCC/Panel\nTray 경로\nPDF/DXF", COL["purple"], COL["soft_purple"]),
        ("내역/성과품", "수량산출\n단가매칭\n내역서", COL["navy"], COL["soft_gray"]),
    ]
    x = 70
    for i, (title, body, color, fill) in enumerate(steps):
        box(draw, x, 315, 260, 230, title, body, color, fill)
        if i < len(steps) - 1:
            arrow(draw, (x + 260, 430), (x + 310, 430), COL["blue"], 6)
        x += 310
    draw_text(draw, (90, 680), "보고서 관점", 34, bold=True)
    draw_text(
        draw,
        (90, 735),
        "핵심은 단순 계산 자동화가 아니라 공정 설계, 카탈로그, 국내 기준, 단가 DB를 연결해 최종 성과품을 생성하는 구조입니다.",
        29,
        COL["muted"],
        max_width=1350,
    )
    return save(img, "fig01_overall_structure.png")


def figure_02():
    img, draw = base("자료별 역할 맵", "사용자가 제공한 파일을 입력, 계산, 기준, 수량, 내역, 단가 DB 역할로 구분")
    cards = [
        ("입력", "카탈로그_기계_v1.5.0\n공정별 장비 선택값", COL["blue"], COL["soft_blue"]),
        ("계산", "260106_전기계산서\n부하/전선/IO/케이블", COL["green"], COL["soft_green"]),
        ("수량", "260401_전기 수량 산출\n전선/전선관/Tray/MCC", COL["orange"], COL["soft_orange"]),
        ("단가 DB", "카탈로그_전기_v1.3.0\n카탈로그_계측기_v.1.3.0", COL["purple"], COL["soft_purple"]),
        ("내역", "내역서(양식)_국문(Metric)_r11\n6-1 ~ 6-4 전기 파트", COL["navy"], COL["soft_gray"]),
    ]
    positions = [(90, 250), (840, 250), (90, 435), (840, 435), (90, 620)]
    for (title, body, color, fill), (x, y) in zip(cards, positions):
        box(draw, x, y, 650, 145, title, body, color, fill)
    return save(img, "fig02_source_map.png")


def figure_03():
    img, draw = base("기계 카탈로그에서 전기계산서로 넘어가는 값", "기계 모델 선택 결과가 전기설계 입력값으로 정규화되는 과정")
    box(draw, 90, 270, 390, 360, "기계 카탈로그", "equipment_code\n장비유형\n모델명\n동력(kW)\n기동방식\n정격전압\n효율/극수/허용률", COL["blue"], COL["soft_blue"])
    box(draw, 610, 270, 390, 360, "전기 입력 중간 데이터", "기기번호\n기기명\n사양\n적용/예비 수량\n기동방식 표시명\n전기 계산 입력값", COL["green"], COL["soft_green"])
    box(draw, 1130, 270, 390, 360, "전기계산서", "부하용량\n정격전류\n적용전류\nMCC 그룹\n부하일람표", COL["orange"], COL["soft_orange"])
    arrow(draw, (480, 445), (590, 445), COL["blue"], 7)
    arrow(draw, (1000, 445), (1110, 445), COL["blue"], 7)
    draw_text(draw, (120, 735), "예: S_SYS01=직입기동, S_SYS02=인버터, S_SYS03=소프트스타터, S_SYS04=MOP", 27, COL["muted"], max_width=1300)
    return save(img, "fig03_catalog_to_calculation.png")


def figure_04():
    img, draw = base("참조 기준 매트릭스", "각 산출 항목은 서로 다른 기준과 카탈로그를 근거로 생성")
    headers = ["산출 항목", "주요 기준", "데이터 출처"]
    rows = [
        ("전선/접지선", "KEC, KS C IEC 60364-5-52/54", "전기계산서 참조표, 전기 카탈로그"),
        ("차단기", "KEC 과전류보호, 제조사 카탈로그", "차단기 참조표, 카탈로그_전기"),
        ("MCC/LOP", "기동방식, 사내 MCC 표준", "기계 카탈로그, 전기 카탈로그"),
        ("Tray/전선관", "KEC 배선설비, KS C IEC 61537-A", "3D 배치, 수량산출서"),
        ("내역서", "단가출처, 단위대가, 양식 기준", "전기/계측 카탈로그, 내역서 양식"),
    ]
    x0, y0 = 80, 240
    widths = [340, 520, 620]
    row_h = 85
    round_box(draw, (x0, y0, x0 + sum(widths), y0 + row_h * (len(rows) + 1)), COL["white"], COL["line"], 16)
    x = x0
    for header, width in zip(headers, widths):
        draw.rectangle((x, y0, x + width, y0 + row_h), fill=COL["navy"])
        draw_text(draw, (x + 18, y0 + 24), header, 24, COL["white"], bold=True)
        x += width
    for idx, row in enumerate(rows):
        y = y0 + row_h * (idx + 1)
        x = x0
        for value, width in zip(row, widths):
            draw.rectangle((x, y, x + width, y + row_h), fill=COL["white"], outline=COL["line"])
            draw_text(draw, (x + 18, y + 18), value, 21, COL["ink"] if x == x0 else COL["muted"], max_width=width - 30)
            x += width
    return save(img, "fig04_reference_matrix.png")


def figure_05():
    img, draw = base("최종 성과품 묶음", "자동화 결과로 생성하거나 설명해야 하는 전기설계 성과품")
    items = [
        ("용량계산서", "동력설비 부하계산서\n부하일람표\n동력설비 리스트\nIO 집계표"),
        ("도면", "단선결선도\nMCC 구성도\n전기 평면도\n케이블 포설준공 도면"),
        ("수량산출서", "전선\n전선관\n케이블트레이\nLOP/MCC\n계측기"),
        ("내역서", "기자재내역서\n설치비내역서\n일위대가목록\n일위대가"),
    ]
    colors = [COL["blue"], COL["green"], COL["orange"], COL["purple"]]
    fills = [COL["soft_blue"], COL["soft_green"], COL["soft_orange"], COL["soft_purple"]]
    x = 100
    for idx, (title, body) in enumerate(items):
        box(draw, x, 305, 330, 370, title, body, colors[idx], fills[idx])
        x += 375
    draw_text(draw, (110, 760), "성과품은 각각 별도 파일이지만 같은 입력값과 기준정보에서 파생되는 묶음입니다.", 30, COL["muted"], max_width=1350)
    return save(img, "fig05_deliverables.png")


def figure_06():
    img, draw = base("수량산출서에서 내역서로 가는 구조", "수량과 단가를 equipment_code로 연결해 전기 내역서를 생성")
    steps = [
        ("계산/도면 결과", "전선 규격\n전선관 규격\nTray 수량\nMCC/LOP"),
        ("수량산출서", "3-1 전선\n3-2 전선관\n3-3 Tray\n3-4/3-5 Panel"),
        ("카탈로그 매칭", "equipment_code\n품명\n규격\n단가\n출처"),
        ("내역서 양식", "6-1 기자재\n6-2 설치비\n6-3 목록\n6-4 일위대가"),
    ]
    colors = [COL["blue"], COL["orange"], COL["green"], COL["navy"]]
    fills = [COL["soft_blue"], COL["soft_orange"], COL["soft_green"], COL["soft_gray"]]
    x = 100
    for idx, (title, body) in enumerate(steps):
        box(draw, x, 320, 310, 260, title, body, colors[idx], fills[idx])
        if idx < len(steps) - 1:
            arrow(draw, (x + 310, 450), (x + 365, 450), COL["blue"], 6)
        x += 380
    draw_text(draw, (110, 710), "핵심 설명", 34, bold=True)
    draw_text(draw, (110, 765), "수량산출서는 '무엇이 몇 m 필요한지'를 만들고, 내역서는 그 수량에 카탈로그 단가와 일위대가를 붙여 금액을 계산합니다.", 29, COL["muted"], max_width=1350)
    return save(img, "fig06_estimate_pipeline.png")


def make_figures():
    return [figure_01(), figure_02(), figure_03(), figure_04(), figure_05(), figure_06()]


def html_doc(figures):
    fig = {name: f"assets/{name}" for name in figures}
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>전기설계 자동화 구조 및 레퍼런스 보고서</title>
  <style>
    :root {{ --ink:#17202A; --muted:#5D6778; --line:#D7DDE6; --blue:#1F5EFF; --bg:#F6F8FB; --card:#FFFFFF; --orange:#E36B2C; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family:'Malgun Gothic', Arial, sans-serif; color:var(--ink); background:var(--bg); line-height:1.65; }}
    .topbar {{ height:12px; background:var(--blue); }}
    main {{ max-width:1120px; margin:0 auto; padding:48px 36px 80px; }}
    .cover {{ background:linear-gradient(135deg,#ffffff,#eef4ff); border:1px solid var(--line); border-radius:24px; padding:48px; margin-bottom:34px; }}
    h1 {{ font-size:42px; margin:0 0 14px; letter-spacing:0; }}
    h2 {{ font-size:28px; margin:48px 0 12px; padding-top:12px; border-top:2px solid var(--line); }}
    p {{ font-size:16px; margin:10px 0; }}
    a {{ color:#1F5EFF; }}
    .lead {{ font-size:20px; color:var(--muted); max-width:900px; }}
    .tag {{ display:inline-block; color:var(--blue); background:#EAF0FF; border-radius:999px; padding:6px 14px; font-weight:700; margin-bottom:18px; }}
    .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:18px 0; }}
    .card {{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px; }}
    .card strong {{ color:var(--blue); }}
    figure {{ margin:28px 0; background:#fff; border:1px solid var(--line); border-radius:18px; padding:14px; }}
    figure img {{ width:100%; display:block; border-radius:12px; }}
    figcaption {{ color:var(--muted); font-size:14px; margin:10px 4px 0; }}
    table {{ width:100%; border-collapse:collapse; margin:18px 0; background:#fff; border:1px solid var(--line); }}
    th, td {{ border:1px solid var(--line); padding:10px 12px; text-align:left; vertical-align:top; font-size:14px; }}
    th {{ background:#183153; color:white; }}
    code {{ background:#EEF2F6; padding:2px 6px; border-radius:6px; }}
    .note {{ border-left:6px solid var(--orange); background:#FFF1E8; padding:14px 18px; border-radius:10px; margin:18px 0; }}
    .footer {{ color:var(--muted); font-size:13px; margin-top:60px; }}
    @media print {{ body {{ background:white; }} main {{ max-width:none; padding:20px; }} h2 {{ break-after:avoid; }} figure {{ break-inside:avoid; }} .cover {{ break-inside:avoid; }} }}
  </style>
</head>
<body>
<div class="topbar"></div>
<main>
  <section class="cover">
    <div class="tag">보고자료 v0.1</div>
    <h1>전기설계 자동화 구조 및 레퍼런스 보고서</h1>
    <p class="lead">조언을 반영해 전기설계 자동화 프로그램이 어떤 입력자료를 받고, 어떤 기준을 참고하며, 최종 성과품을 어떻게 생성하는지 설명하기 위한 보고자료입니다.</p>
  </section>

  <h2>1. 보고서 목적</h2>
  <p>이 보고서는 전기설계 자동화 프로그램을 단순 계산서 생성 기능이 아니라, 공정 설계, 기계 카탈로그, 국내 전기설계 기준, 전기/계측기 단가 DB, 도면 및 내역서 양식을 연결하는 성과품 생성 구조로 설명하기 위해 작성했습니다.</p>
  <div class="note">핵심 메시지: 사람이 공정을 설계하고 카탈로그에서 기계를 선택하면, 그 선택값이 전기계산서, 도면, 수량산출서, 내역서로 이어집니다.</div>
  <figure><img src="{fig['fig01_overall_structure.png']}" alt="전체 구조"><figcaption>그림 1. 전기설계 자동화 전체 구조</figcaption></figure>

  <h2>2. 참고한 원본 자료</h2>
  <p>사용자가 제공한 자료는 역할에 따라 입력, 계산, 수량, 내역, 단가 DB로 나누어 정리했습니다.</p>
  <figure><img src="{fig['fig02_source_map.png']}" alt="자료별 역할 맵"><figcaption>그림 2. 원본 자료별 역할 맵</figcaption></figure>
  <table>
    <thead><tr><th>자료</th><th>보고서에서 보는 역할</th></tr></thead>
    <tbody>
      <tr><td><code>카탈로그_기계_v1.5.0.xlsx</code></td><td>공정별 기계 선택 시 전기설계 입력값을 제공합니다. 동력, 기동방식, 전압, 효율, 극수, 허용률 등이 핵심입니다.</td></tr>
      <tr><td><code>260106_전기계산서(최종샘플).xlsx</code></td><td>전기 용량계산서, 부하일람표, 전선/차단기, IO, 케이블 계산 흐름의 원형입니다.</td></tr>
      <tr><td><code>260401_전기 수량 산출_r3.xlsx</code></td><td>계산/도면 결과를 전선, 전선관, Tray, LOP, MCC 등 항목별 수량으로 집계합니다.</td></tr>
      <tr><td><code>내역서(양식)_국문(Metric)_r11.xlsx</code></td><td>전기 내역서 양식입니다. 전기 파트는 6-1~6-4 시트를 중심으로 참고합니다.</td></tr>
      <tr><td><code>카탈로그_전기_v1.3.0.xlsx</code>, <code>카탈로그_계측기_v.1.3.0.xlsx</code></td><td>내역서 생성을 위한 품명, 규격, 단위, 단가, 단가출처 DB 역할을 합니다.</td></tr>
    </tbody>
  </table>

  <h2>3. 입력 구조</h2>
  <p>전기설계 입력값은 전기 담당자가 모든 항목을 직접 입력하는 방식이 아닙니다. 사용자가 공정을 설계하고 기계 카탈로그에서 장비 모델을 선택하면, 해당 장비의 전기 속성이 전기계산서 입력값으로 전달됩니다.</p>
  <figure><img src="{fig['fig03_catalog_to_calculation.png']}" alt="카탈로그에서 계산서로"><figcaption>그림 3. 기계 카탈로그 값이 전기계산서 입력값으로 바뀌는 과정</figcaption></figure>

  <h2>4. 계산 구조</h2>
  <p>전기계산서는 카탈로그 기반 기기 리스트를 받아 부하용량, 정격전류, 적용전류, MCC 그룹, 부하일람표, 전선/접지선/차단기 선정, IO 집계, 케이블 포설준공 정보를 생성합니다.</p>
  <div class="grid">
    <div class="card"><strong>계산 산출물</strong><br>동력설비 부하계산서, 부하일람표, 동력설비 리스트, IO 집계표</div>
    <div class="card"><strong>선정 산출물</strong><br>전선, 접지선, 차단기, 제어기기, 전선관, 케이블 포설준공 정보</div>
  </div>

  <h2>5. 기준과 레퍼런스</h2>
  <p>각 산출 항목은 서로 다른 기준을 참고합니다. 법적/기술 기준은 KEC와 KS/IEC를 기준으로 하고, 실제 모델명과 단가는 제조사 또는 내부 카탈로그 DB를 기준으로 합니다.</p>
  <figure><img src="{fig['fig04_reference_matrix.png']}" alt="기준 매트릭스"><figcaption>그림 4. 산출 항목별 주요 레퍼런스</figcaption></figure>
  <ul>
    <li>전선/배선설비: KEC, KS C IEC 60364-5-52</li>
    <li>보호도체/접지: KEC, KS C IEC 60364-5-54</li>
    <li>케이블 트레이: KS C IEC 61537-A, 제조사 카탈로그</li>
    <li>차단기/제어기기: KEC 과전류보호 조건, 제조사 카탈로그</li>
    <li>내역서: 전기/계측기 카탈로그, 단가출처, 일위대가 양식</li>
  </ul>
  <table>
    <thead><tr><th>레퍼런스</th><th>활용 위치</th><th>확인 경로</th></tr></thead>
    <tbody>
      <tr><td>한국전기설비규정(KEC)</td><td>전선, 접지, 보호장치, 배선설비 기준</td><td><a href="https://kec.kea.kr/sub_about/overview.php">KEC 개요</a>, <a href="https://kec.kea.kr/sub_about/regulation.php">KEC 규정</a></td></tr>
      <tr><td>KEC 핸드북/공고</td><td>세부 해설, 적용 기준 버전 확인</td><td><a href="https://kec.kea.kr/sub_tech/regulation_book.php">핸드북</a>, <a href="https://kec.kea.kr/sub_tech/regulation_all.php">공고/전문</a></td></tr>
      <tr><td>KS C IEC 60364-5-52</td><td>배선설비 선정과 시공</td><td><a href="https://www.standard.go.kr/KSCI/standardIntro/getStandardSearchView.do?ksNo=KSCIEC60364-5-52">e나라 표준인증</a></td></tr>
      <tr><td>KS C IEC 60364-5-54</td><td>접지설비와 보호도체</td><td><a href="https://www.kssn.net/search/stddetail.do?itemNo=K001010151454">KSSN 표준 상세</a></td></tr>
      <tr><td>KS C IEC 61537-A</td><td>케이블 트레이 및 래더 시스템</td><td><a href="https://www.kssn.net/search/stddetail.do?itemNo=K001010148765">KSSN 표준 상세</a></td></tr>
      <tr><td>기계/전기/계측기 카탈로그</td><td>모델, 규격, 단가, 코드 매칭</td><td>프로젝트 제공 XLSX 파일</td></tr>
    </tbody>
  </table>

  <h2>6. 최종 성과품</h2>
  <p>최종 성과품은 계산서, 도면, 수량산출서, 내역서가 함께 묶인 구조입니다. 각각 별도 파일처럼 보이지만 같은 입력값과 기준정보에서 파생됩니다.</p>
  <figure><img src="{fig['fig05_deliverables.png']}" alt="성과품 묶음"><figcaption>그림 5. 전기설계 자동화의 최종 성과품 묶음</figcaption></figure>

  <h2>7. 수량산출서와 내역서 생성</h2>
  <p>수량산출서는 계산서와 도면 결과를 항목별 수량으로 집계합니다. 내역서는 그 수량에 전기/계측기 카탈로그의 단가와 일위대가를 붙여 금액을 계산합니다.</p>
  <figure><img src="{fig['fig06_estimate_pipeline.png']}" alt="내역서 생성 구조"><figcaption>그림 6. 수량산출서에서 내역서로 가는 구조</figcaption></figure>
  <table>
    <thead><tr><th>단계</th><th>설명</th></tr></thead>
    <tbody>
      <tr><td>수량산출</td><td>전선, 전선관, Tray, LOP, MCC, 계측기 수량을 집계합니다.</td></tr>
      <tr><td>카탈로그 매칭</td><td><code>equipment_code</code> 또는 품목 코드를 기준으로 품명, 규격, 단위, 단가, 단가출처를 조회합니다.</td></tr>
      <tr><td>내역서 반영</td><td>국문 Metric 내역서 양식의 6-1 기자재내역서, 6-2 설치비내역서, 6-3 일위대가목록, 6-4 일위대가에 반영합니다.</td></tr>
    </tbody>
  </table>

  <h2>8. 보고자료용 핵심 문장</h2>
  <div class="card">WAI Design의 전기설계 자동화는 공정 설계와 기계 카탈로그 선택값을 출발점으로 삼아, 국내 전기설계 기준과 전기/계측 카탈로그 DB를 적용하고, 최종적으로 용량계산서, 도면, 수량산출서, 내역서를 일관된 데이터 흐름으로 생성하는 구조입니다.</div>

  <h2>9. 후속 보완 포인트</h2>
  <ul>
    <li>각 참조표의 기준 버전과 적용일자를 DB 필드로 관리해야 합니다.</li>
    <li>카탈로그의 <code>equipment_code</code>를 계산서, 수량산출서, 내역서의 공통 키로 고정해야 합니다.</li>
    <li>수량산출 기준, 단가출처, 일위대가 템플릿은 내역서 생성 이력에 함께 남겨야 합니다.</li>
    <li>도면 수동 편집이 발생하면 계산 데이터와 도면 데이터의 동기화 정책이 필요합니다.</li>
  </ul>

  <p class="footer">Generated in electrical-design-deliverables / report v0.1</p>
</main>
</body>
</html>"""


def markdown_doc(figures):
    fig = {name: f"assets/{name}" for name in figures}
    return f"""# 전기설계 자동화 구조 및 레퍼런스 보고서

## 1. 보고서 목적

전기설계 자동화 프로그램이 어떤 입력자료를 받고, 어떤 기준을 참고하며, 최종 성과품을 어떻게 생성하는지 설명하기 위한 보고자료입니다.

![전체 구조]({fig['fig01_overall_structure.png']})

## 2. 참고한 원본 자료

![자료별 역할 맵]({fig['fig02_source_map.png']})

| 자료 | 역할 |
| --- | --- |
| `카탈로그_기계_v1.5.0.xlsx` | 공정별 기계 선택 시 전기설계 입력값 제공 |
| `260106_전기계산서(최종샘플).xlsx` | 전기계산서 및 계산 흐름 원형 |
| `260401_전기 수량 산출_r3.xlsx` | 항목별 수량산출 |
| `내역서(양식)_국문(Metric)_r11.xlsx` | 전기 내역서 양식 |
| `카탈로그_전기_v1.3.0.xlsx`, `카탈로그_계측기_v.1.3.0.xlsx` | 품명, 규격, 단가 DB |

## 3. 입력 구조

![카탈로그에서 계산서로]({fig['fig03_catalog_to_calculation.png']})

## 4. 기준과 레퍼런스

![기준 매트릭스]({fig['fig04_reference_matrix.png']})

| 레퍼런스 | 활용 위치 | 확인 경로 |
| --- | --- | --- |
| 한국전기설비규정(KEC) | 전선, 접지, 보호장치, 배선설비 기준 | https://kec.kea.kr/sub_about/overview.php |
| KEC 규정/핸드북/공고 | 세부 해설, 적용 기준 버전 확인 | https://kec.kea.kr/sub_about/regulation.php |
| KS C IEC 60364-5-52 | 배선설비 선정과 시공 | https://www.standard.go.kr/KSCI/standardIntro/getStandardSearchView.do?ksNo=KSCIEC60364-5-52 |
| KS C IEC 60364-5-54 | 접지설비와 보호도체 | https://www.kssn.net/search/stddetail.do?itemNo=K001010151454 |
| KS C IEC 61537-A | 케이블 트레이 및 래더 시스템 | https://www.kssn.net/search/stddetail.do?itemNo=K001010148765 |
| 기계/전기/계측기 카탈로그 | 모델, 규격, 단가, 코드 매칭 | 프로젝트 제공 XLSX 파일 |

## 5. 최종 성과품

![성과품 묶음]({fig['fig05_deliverables.png']})

## 6. 수량산출서와 내역서 생성

![내역서 생성 구조]({fig['fig06_estimate_pipeline.png']})

## 보고자료용 핵심 문장

WAI Design의 전기설계 자동화는 공정 설계와 기계 카탈로그 선택값을 출발점으로 삼아, 국내 전기설계 기준과 전기/계측 카탈로그 DB를 적용하고, 최종적으로 용량계산서, 도면, 수량산출서, 내역서를 일관된 데이터 흐름으로 생성하는 구조입니다.
"""


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    figures = make_figures()
    HTML_PATH.write_text(html_doc(figures), encoding="utf-8")
    MD_PATH.write_text(markdown_doc(figures), encoding="utf-8")
    print(HTML_PATH)
    print(MD_PATH)
    print(ASSET_DIR)


if __name__ == "__main__":
    main()
