"""Читает метаданные шрифта и извлекает контуры нужных глифов в SVG-пути."""
import json
import sys

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

NAME_IDS = {
    0: "Copyright",
    1: "Family",
    2: "Subfamily",
    3: "Unique ID",
    4: "Full name",
    5: "Version",
    6: "PostScript name",
    7: "Trademark",
    8: "Manufacturer",
    9: "Designer",
    11: "Vendor URL",
    12: "Designer URL",
    13: "License Description",
    14: "License URL",
}

path = sys.argv[1]
chars = sys.argv[2] if len(sys.argv) > 2 else "FR"

font = TTFont(path, fontNumber=0)

print("=== МЕТАДАННЫЕ ===")
for nid, label in NAME_IDS.items():
    rec = font["name"].getDebugName(nid)
    if rec:
        print(f"{label} ({nid}): {rec}")

upem = font["head"].unitsPerEm
print(f"\nunitsPerEm: {upem}")
print(f"Таблицы: {', '.join(sorted(font.keys()))}")

# Флаги встраивания из OS/2 fsType — важны юридически
if "OS/2" in font:
    fstype = font["OS/2"].fsType
    meanings = {
        0: "Installable Embedding (без ограничений)",
        2: "Restricted License (встраивание запрещено)",
        4: "Preview & Print",
        8: "Editable Embedding",
    }
    print(f"OS/2 fsType: {fstype} — {meanings.get(fstype & 0x0F, 'комбинация/нестандарт')}")

cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
hmtx = font["hmtx"]

out = {"unitsPerEm": upem, "glyphs": {}}

print("\n=== ГЛИФЫ ===")
for ch in chars:
    code = ord(ch)
    if code not in cmap:
        print(f"{ch}: НЕ НАЙДЕН в cmap")
        continue
    gname = cmap[code]
    pen = SVGPathPen(glyph_set)
    glyph_set[gname].draw(pen)
    d = pen.getCommands()

    bpen = BoundsPen(glyph_set)
    glyph_set[gname].draw(bpen)
    adv, lsb = hmtx[gname]

    out["glyphs"][ch] = {
        "name": gname,
        "d": d,
        "advance": adv,
        "lsb": lsb,
        "bounds": bpen.bounds,
    }
    print(f"{ch}: глиф '{gname}', advance={adv}, bounds={bpen.bounds}, длина пути={len(d)} симв.")

with open(sys.argv[3] if len(sys.argv) > 3 else "glyphs.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f"\nСохранено в {sys.argv[3] if len(sys.argv) > 3 else 'glyphs.json'}")
