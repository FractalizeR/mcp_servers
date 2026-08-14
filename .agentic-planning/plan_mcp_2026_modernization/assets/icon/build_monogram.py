"""Собирает монограмму FR из глифов шрифта, оптимизируя размер пути под data URI."""
import base64
import json
import sys

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

FONT = sys.argv[1]
BOX = 64.0          # целевой viewBox
PAD = 3.0           # поля внутри бокса

font = TTFont(FONT, fontNumber=0)
cmap = font.getBestCmap()
gs = font.getGlyphSet()
upem = font["head"].unitsPerEm


def rounder(precision):
    def ntos(n):
        r = round(n, precision)
        if r == int(r):
            return str(int(r))
        return str(r)
    return ntos


def glyph_bounds(ch):
    pen = BoundsPen(gs)
    gs[cmap[ord(ch)]].draw(pen)
    return pen.bounds


def build(dx_units, precision, scale_to_box=True):
    """dx_units — сдвиг R вправо в единицах шрифта."""
    fb = glyph_bounds("F")
    rb = glyph_bounds("R")
    x0 = min(fb[0], rb[0] + dx_units)
    y0 = min(fb[1], rb[1])
    x1 = max(fb[2], rb[2] + dx_units)
    y1 = max(fb[3], rb[3])

    w, h = x1 - x0, y1 - y0
    inner = BOX - 2 * PAD
    s = inner / max(w, h) if scale_to_box else 1.0

    # центрируем
    off_x = PAD + (inner - w * s) / 2
    off_y = PAD + (inner - h * s) / 2

    paths = []
    for ch, shift in (("F", 0), ("R", dx_units)):
        # SVG: Y вниз -> отражаем; переносим bbox в начало координат
        t = Transform()
        t = t.translate(off_x, BOX - off_y)
        t = t.scale(s, -s)
        t = t.translate(-x0 + shift, -y0)
        pen = SVGPathPen(gs, ntos=rounder(precision))
        gs[cmap[ord(ch)]].draw(TransformPen(pen, t))
        paths.append(pen.getCommands())
    return "".join(paths)


def svg_wrap(d, frame=None):
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
            'fill="currentColor">')
    body = ""
    if frame == "circle":
        body += ('<circle cx="32" cy="32" r="30.2" fill="none" '
                 'stroke="currentColor" stroke-width="2.6"/>')
    elif frame == "square":
        body += ('<rect x="2" y="2" width="60" height="60" rx="13" fill="none" '
                 'stroke="currentColor" stroke-width="2.6"/>')
    return f'{head}{body}<path d="{d}"/></svg>'


def data_uri_size(svg):
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return len("data:image/svg+xml;base64,") + len(b64)


print(f"{'вариант':<34} {'точность':>8} {'путь':>7} {'data URI':>10}")
print("-" * 64)

results = {}
for label, dx, frame in [
    ("Плотная связка", 430, None),
    ("По метрике шрифта", 537, None),
    ("Разреженная", 640, None),
    ("По метрике, в круге", 537, "circle"),
    ("По метрике, в квадрате", 537, "square"),
]:
    for prec in (2, 1, 0):
        d = build(dx, prec)
        svg = svg_wrap(d, frame)
        size = data_uri_size(svg)
        key = f"{label} · округл.{prec}"
        print(f"{key:<34} {prec:>8} {len(d):>7} {size:>10}")
        results[key] = {"svg": svg, "bytes": size, "dx": dx,
                        "frame": frame, "precision": prec, "label": label}
    print()

with open(sys.argv[2], "w") as f:
    json.dump(results, f, ensure_ascii=False)
print(f"Сохранено: {sys.argv[2]}")
