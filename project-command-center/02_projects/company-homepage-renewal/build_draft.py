from PIL import Image, ImageDraw, ImageFont
import math

OUTPUT = r"C:\Users\USER\Desktop\homepage\docs\homepage_draft.png"

W = 900

# ── 색상 ──────────────────────────────────────────────
BG       = (10, 14, 26)
BG2      = (15, 21, 40)
CARD     = (22, 30, 55)
BLUE     = (41, 98, 255)
BLUE_LT  = (80, 130, 255)
GREEN    = (0, 170, 115)
PURPLE   = (130, 60, 210)
WHITE    = (255, 255, 255)
GRAY     = (150, 165, 190)
LGRAY    = (200, 210, 230)

# ── 폰트 ──────────────────────────────────────────────
def load_fonts():
    try:
        bold  = r"C:\Windows\Fonts\malgunbd.ttf"
        reg   = r"C:\Windows\Fonts\malgun.ttf"
        return {
            "xl":  ImageFont.truetype(bold, 36),
            "lg":  ImageFont.truetype(bold, 26),
            "md":  ImageFont.truetype(bold, 19),
            "sm":  ImageFont.truetype(reg,  15),
            "xs":  ImageFont.truetype(reg,  13),
            "tag": ImageFont.truetype(bold, 12),
        }
    except Exception:
        d = ImageFont.load_default()
        return {k: d for k in ("xl","lg","md","sm","xs","tag")}

F = load_fonts()

# ── 공통 헬퍼 ─────────────────────────────────────────
def text_w(draw, txt, font):
    return draw.textlength(txt, font=font)

def centered_text(draw, txt, font, y, color=WHITE, x0=0, x1=W):
    tw = text_w(draw, txt, font)
    draw.text(((x0 + x1 - tw) / 2, y), txt, font=font, fill=color)

def tag_label(draw, txt, x, y, color=BLUE):
    tw = text_w(draw, txt, F["tag"]) + 18
    draw.rounded_rectangle([x, y, x + tw, y + 22], radius=4, fill=color)
    draw.text((x + 9, y + 5), txt, font=F["tag"], fill=WHITE)

def card(draw, x, y, w, h, title, body, accent=BLUE):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=8, fill=CARD)
    draw.line([(x, y), (x, y+h)], fill=accent, width=3)
    draw.text((x+14, y+14), title, font=F["sm"], fill=WHITE)
    # body — 줄바꿈 지원
    lines = body.split("\n")
    ty = y + 38
    for line in lines:
        draw.text((x+14, ty), line, font=F["xs"], fill=GRAY)
        ty += 18

def arrow_right(draw, x, y, length=28, color=GRAY):
    ex = x + length
    draw.line([(x, y), (ex, y)], fill=color, width=2)
    draw.polygon([(ex, y-5), (ex+8, y), (ex, y+5)], fill=color)

def circle_node(draw, cx, cy, r, label, sub="", fill=BG2, outline=BLUE):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill, outline=outline, width=2)
    lw = text_w(draw, label, F["xs"])
    draw.text((cx - lw/2, cy - 8), label, font=F["xs"], fill=WHITE)
    if sub:
        sw = text_w(draw, sub, F["tag"])
        draw.text((cx - sw/2, cy + 8), sub, font=F["tag"], fill=GRAY)

def arc_arrow(draw, cx, cy, r, a_start, a_end, color=BLUE_LT):
    """근사 호 화살표 — 점으로 그리기"""
    steps = 40
    pts = []
    for i in range(steps + 1):
        a = math.radians(a_start + (a_end - a_start) * i / steps)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    for i in range(len(pts)-1):
        draw.line([pts[i], pts[i+1]], fill=color, width=2)
    # 화살촉
    tip = pts[-1]
    prev = pts[-3]
    dx, dy = tip[0]-prev[0], tip[1]-prev[1]
    length = math.hypot(dx, dy)
    if length:
        dx, dy = dx/length*8, dy/length*8
        nx, ny = -dy, dx
        draw.polygon([
            (tip[0]+dx, tip[1]+dy),
            (tip[0]-dx+nx, tip[1]-dy+ny),
            (tip[0]-dx-nx, tip[1]-dy-ny),
        ], fill=color)

# ════════════════════════════════════════════════════════
# 1Page — Problem / Solution
# ════════════════════════════════════════════════════════
def draw_page1(draw, y0):
    H = 620

    # 배경
    draw.rectangle([0, y0, W, y0+H], fill=BG)

    # 상단 라벨 바
    draw.rectangle([0, y0, W, y0+48], fill=BLUE)
    draw.text((20, y0+14), "01   Problem / Solution", font=F["md"], fill=WHITE)

    # 히어로 타이틀
    draw.text((50, y0+72), "GWD 기반  수처리 설계 자동화", font=F["xl"], fill=WHITE)
    draw.text((50, y0+118), "기존 방식의 분절된 설계 흐름을 하나의 엔진으로 연결합니다", font=F["sm"], fill=GRAY)

    # ── 기존 방식 vs GWD 방식 비교 ──
    mid = W // 2
    box_y = y0 + 160
    box_h = 200

    # 기존 방식 박스
    draw.rounded_rectangle([40, box_y, mid-20, box_y+box_h], radius=8, fill=(30,18,18))
    draw.line([(40, box_y), (40, box_y+box_h)], fill=(200,60,60), width=3)
    draw.text((56, box_y+14), "기존 방식", font=F["md"], fill=(220,90,90))
    items_old = [
        "공정 계산   ←   별도 작업",
        "3D 설계      ←   별도 작업",
        "도면 작성   ←   별도 작업",
        "물량 산출   ←   별도 작업",
        "비용 산출   ←   별도 작업",
    ]
    for i, t in enumerate(items_old):
        draw.text((56, box_y+46+i*27), t, font=F["xs"], fill=(200,160,160))

    # 화살표
    draw.text((mid-10, box_y+box_h//2-10), "→", font=F["lg"], fill=BLUE)

    # GWD 방식 박스
    draw.rounded_rectangle([mid+20, box_y, W-40, box_y+box_h], radius=8, fill=(12,22,45))
    draw.line([(mid+20, box_y), (mid+20, box_y+box_h)], fill=BLUE, width=3)
    draw.text((mid+36, box_y+14), "GWD 방식", font=F["md"], fill=BLUE_LT)
    items_new = [
        "공정 조건 입력",
        "    ↓",
        "3D Layout · 도면 · 물량 자동 연동",
        "    ↓",
        "CAPEX / OPEX 일괄 산출",
    ]
    for i, t in enumerate(items_new):
        draw.text((mid+36, box_y+46+i*27), t, font=F["xs"], fill=LGRAY)

    # ── 핵심 메시지 3카드 ──
    card_y = y0 + 386
    cw, ch = 248, 80
    gap = 22
    x0s = [40, 40+cw+gap, 40+(cw+gap)*2]
    titles  = ["반복 수정 감소", "산출물 일관성 향상", "설계 검토 속도 개선"]
    bodies  = [
        "변경 시 연계 산출물이\n자동으로 갱신됩니다",
        "공정→도면→물량→비용이\n하나의 흐름으로 유지됩니다",
        "단계 간 단절 없이\n빠른 검토가 가능합니다",
    ]
    for i in range(3):
        card(draw, x0s[i], card_y, cw, ch, titles[i], bodies[i], BLUE)

    # 주석
    note = "※ GWD는 단순 AI 이미지·컨셉이 아닌 실제 설계 자동화 엔진입니다"
    draw.text((50, y0+H-28), note, font=F["xs"], fill=(100,130,180))

# ════════════════════════════════════════════════════════
# 2Page — WATER AI 환류 구조
# ════════════════════════════════════════════════════════
def draw_page2(draw, y0):
    H = 620

    draw.rectangle([0, y0, W, y0+H], fill=BG2)
    draw.rectangle([0, y0, W, y0+48], fill=GREEN)
    draw.text((20, y0+14), "02   WATER AI  환류 구조", font=F["md"], fill=WHITE)

    draw.text((50, y0+72), "설계 데이터가 시공·운영을 거쳐 다시 설계로 돌아옵니다", font=F["lg"], fill=WHITE)
    draw.text((50, y0+108), "WATER AI는 완성형 제품이 아닌, GWD 기반 데이터를 전 주기로 확장하는 플랫폼입니다", font=F["xs"], fill=GRAY)

    # ── 환류 순환 다이어그램 ──
    cx, cy = W//2, y0 + 310
    R_orbit = 155   # 노드 궤도
    R_node  = 38    # 노드 반지름
    R_center = 52

    nodes = [
        (-90,  "설계",    "Engineering", BLUE),
        (  0,  "시공",    "Construction", (60,160,240)),
        ( 90,  "운영",    "Operation",    GREEN),
        (180,  "재설계",  "Re-Design",    (180,100,255)),
    ]

    # 궤도 원
    draw.ellipse([cx-R_orbit, cy-R_orbit, cx+R_orbit, cy+R_orbit],
                 outline=(40,55,90), width=1)

    # 호 화살표 4개
    for i, (angle, *_) in enumerate(nodes):
        a_s = angle + 20
        a_e = nodes[(i+1) % 4][0] - 20
        arc_arrow(draw, cx, cy, R_orbit, a_s, a_e, color=BLUE_LT)

    # 노드
    for angle, label, sub, color in nodes:
        rad = math.radians(angle)
        nx = cx + R_orbit * math.cos(rad)
        ny = cy + R_orbit * math.sin(rad)
        circle_node(draw, nx, ny, R_node, label, sub, fill=CARD, outline=color)

    # 중심 — WAI
    draw.ellipse([cx-R_center, cy-R_center, cx+R_center, cy+R_center],
                 fill=(20,35,70), outline=BLUE, width=2)
    wai_w = text_w(draw, "WAI", F["md"])
    draw.text((cx - wai_w/2, cy - 16), "WAI", font=F["md"], fill=BLUE_LT)
    sub_w = text_w(draw, "WATER AI", F["tag"])
    draw.text((cx - sub_w/2, cy + 6), "WATER AI", font=F["tag"], fill=GRAY)

    # 환류 설명
    draw.text((50, y0+490), "설계 데이터", font=F["xs"], fill=LGRAY)
    arrow_right(draw, 130, y0+498, 20, GRAY)
    draw.text((162, y0+490), "시공 정보", font=F["xs"], fill=LGRAY)
    arrow_right(draw, 232, y0+498, 20, GRAY)
    draw.text((264, y0+490), "운영 데이터", font=F["xs"], fill=LGRAY)
    arrow_right(draw, 348, y0+498, 20, GRAY)
    draw.text((380, y0+490), "재설계 기준 개선", font=F["xs"], fill=LGRAY)

    note = "※ 개발 투입 금액·개발 시간·특허 현황 내용 추가 예정"
    draw.text((50, y0+H-28), note, font=F["xs"], fill=(80,130,100))

# ════════════════════════════════════════════════════════
# 3Page — GWD / WAI Planning
# ════════════════════════════════════════════════════════
def draw_page3(draw, y0):
    H = 620

    draw.rectangle([0, y0, W, y0+H], fill=BG)
    draw.rectangle([0, y0, W, y0+48], fill=PURPLE)
    draw.text((20, y0+14), "03   GWD / WAI Planning", font=F["md"], fill=WHITE)

    draw.text((50, y0+72), "공정 조건에서 설계 산출물까지 하나의 흐름으로 연결합니다", font=F["lg"], fill=WHITE)
    draw.text((50, y0+108), "기능 나열보다 실제 사용 흐름을 중심으로 구성합니다", font=F["xs"], fill=GRAY)

    # ── 프로그램 화면 플레이스홀더 ──
    vid_x, vid_y, vid_w, vid_h = 50, y0+138, 400, 200
    draw.rounded_rectangle([vid_x, vid_y, vid_x+vid_w, vid_y+vid_h], radius=8, fill=(18,24,44), outline=(40,55,90), width=1)
    pw = text_w(draw, "▶  GWD / WAI Planning  화면 영상", F["sm"])
    draw.text(((vid_x*2+vid_w-pw)//2, vid_y+vid_h//2-10), "▶  GWD / WAI Planning  화면 영상", font=F["sm"], fill=(80,110,180))

    # ── 우측 설명 카드 ──
    rx = 480
    descs = [
        ("공정 조건 입력",   "수처리 공정 파라미터 설정"),
        ("자동 계산",         "공정 계산 즉시 실행"),
        ("3D Layout",        "레이아웃 자동 생성"),
        ("도면·물량",        "도면 및 수량 산출"),
        ("CAPEX/OPEX",       "비용 자동 산출"),
    ]
    for i, (title, body) in enumerate(descs):
        ry = vid_y + i * 38
        draw.rounded_rectangle([rx, ry, W-40, ry+30], radius=5, fill=CARD)
        draw.line([(rx, ry), (rx, ry+30)], fill=PURPLE, width=3)
        draw.text((rx+12, ry+7), title, font=F["xs"], fill=WHITE)
        bw = text_w(draw, body, F["xs"])
        draw.text((W-50-bw, ry+7), body, font=F["xs"], fill=GRAY)

    # ── 하단 플로우 바 ──
    flow_y = y0 + 370
    steps = ["공정 계산", "3D 레이아웃", "도면 자동화", "물량 산출", "CAPEX/OPEX"]
    subs  = ["Process Calc", "3D Layout", "Drawing Auto", "Qty Take-off", "Cost Est."]
    sw = (W - 80) // len(steps)
    for i, (s, sub) in enumerate(zip(steps, subs)):
        sx = 40 + i * sw
        draw.rounded_rectangle([sx, flow_y, sx+sw-12, flow_y+66], radius=6, fill=CARD, outline=PURPLE, width=1)
        tw = text_w(draw, s, F["xs"])
        draw.text((sx + (sw-12-tw)//2, flow_y+10), s, font=F["xs"], fill=WHITE)
        stw = text_w(draw, sub, F["tag"])
        draw.text((sx + (sw-12-stw)//2, flow_y+32), sub, font=F["tag"], fill=GRAY)
        if i < len(steps)-1:
            arrow_right(draw, sx+sw-12, flow_y+33, 8, PURPLE)

    draw.text((40, flow_y+82), "설계 단계 간 단절 제거  ·  변경 시 결과 갱신  ·  일관된 설계 환경", font=F["xs"], fill=GRAY)

    # ── WAI Planning 비고 카드 ──
    np_y = y0 + 478
    draw.rounded_rectangle([40, np_y, W-40, np_y+80], radius=8, fill=CARD, outline=PURPLE, width=1)
    draw.text((60, np_y+14), "WAI Planning", font=F["md"], fill=(180,120,255))
    draw.text((60, np_y+44), "사용자가 WAI Planning에서 확인할 수 있는 내용을 간략히 보여주는 방향으로 상세 논의 필요", font=F["xs"], fill=GRAY)

    note = "※ 기본 구조 및 WAI Planning 상세 논의 필요  |  영상 또는 프로그램 화면 자료 확인 예정"
    draw.text((50, y0+H-28), note, font=F["xs"], fill=(100,80,160))

# ════════════════════════════════════════════════════════
# 조립
# ════════════════════════════════════════════════════════
TOTAL_H = 620 * 3 + 8
canvas = Image.new("RGB", (W, TOTAL_H), BG)
draw   = ImageDraw.Draw(canvas)

draw_page1(draw, 0)
draw.rectangle([0, 620, W, 624], fill=(30,40,70))   # 구분선
draw_page2(draw, 624)
draw.rectangle([0, 1244, W, 1248], fill=(30,40,70))
draw_page3(draw, 1248)

canvas.save(OUTPUT)
print(f"저장 완료: {OUTPUT}  ({W} x {TOTAL_H}px)")
