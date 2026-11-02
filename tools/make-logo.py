"""Pasto: draws the stand-in logo (until the owner sends the real file) as SVG paths, from the site's own fonts.
   python3 tools/make-logo.py   (needs: pip install fonttools brotli)
   Writes assets/brand/logo-cream.svg, logo-green.svg (wordmark) and logo-round.svg (green disc, for icons)."""
import io, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.join(os.path.dirname(__file__), "..")
FONTS = os.path.join(ROOT, "assets/fonts")
GREEN, CREAM = "#144a3d", "#fbf3dc"

def font(name, axes):
    f = TTFont(os.path.join(FONTS, name))
    return instantiateVariableFont(f, axes)

def text_path(f, text, size, x0, baseline, tracking=0.0):
    """SVG path of text, left at x0, on baseline; returns (d, width)."""
    upm = f["head"].unitsPerEm
    s = size / upm
    cmap, gs = f.getBestCmap(), f.getGlyphSet()
    x, parts = 0.0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(f'<path transform="translate({x0 + x * s:.2f} {baseline}) scale({s:.5f} {-s:.5f})" d="{d}"/>')
        x += gs[g].width + tracking * upm
    return "".join(parts), (x - tracking * upm) * s

serif = font("fraunces-normal-latin.woff2", {"wght": 640})
sans = font("manrope-normal-latin.woff2", {"wght": 700})

# wordmark box 600 x 190: PASTO on top, CUCINA ITALIANA under it, both centred
W = 600
_, pw = text_path(serif, "PASTO", 150, 0, 0, tracking=0.0)
_, sw = text_path(sans, "CUCINA ITALIANA", 30, 0, 0, tracking=0.14)
big, _ = text_path(serif, "PASTO", 150, (W - pw) / 2, 128)
small, _ = text_path(sans, "CUCINA ITALIANA", 30, (W - sw) / 2, 180, tracking=0.14)

def wordmark(color):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 192" width="{W}" height="192"><title>Pasto · Cucina italiana</title><g fill="{color}">{big}{small}</g></svg>\n'

for name, col in (("logo-cream.svg", CREAM), ("logo-green.svg", GREEN)):
    open(os.path.join(ROOT, "assets/brand", name), "w").write(wordmark(col))

# round: green disc, wordmark scaled into it
round_svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><title>Pasto</title>'
             f'<circle cx="512" cy="512" r="512" fill="{GREEN}"/>'
             f'<g fill="{CREAM}" transform="translate(132 412) scale(1.2667)">{big}{small}</g></svg>\n')
open(os.path.join(ROOT, "assets/brand/logo-round.svg"), "w").write(round_svg)
print("logo written")
