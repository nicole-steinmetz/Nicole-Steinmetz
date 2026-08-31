#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Generate the responsive image variants index.html expects.
#
# Run this AFTER exporting from Figma per ASSETS.md.
#   bash tools/optimise-images.sh
#
# Needs ImageMagick. macOS: brew install imagemagick
# Idempotent — safe to re-run.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
IMG="assets/img"
SRC="assets/img/_source"   # Figma exports live here; gitignored

# Resolve a source file by basename, whatever extension it carries.
# Looks in _source/ first, then img/ itself.
src_of() {
  local base="$1" f
  for f in "$SRC/$base".png "$SRC/$base".jpg "$SRC/$base".jpeg \
           "$IMG/$base".png "$IMG/$base".jpg "$IMG/$base".jpeg; do
    [ -f "$f" ] && { printf '%s' "$f"; return 0; }
  done
  return 1
}

if command -v magick >/dev/null 2>&1; then IM="magick"
elif command -v convert >/dev/null 2>&1; then IM="convert"
else
  IM=""
  echo "ImageMagick not found; using Python/Pillow fallback." >&2
  python3 -c "from PIL import Image" >/dev/null 2>&1 || {
    echo "Pillow not found either. Install ImageMagick (brew install imagemagick) or Pillow." >&2
    exit 1
  }
fi

mkdir -p "$SRC"

# hero: 4 widths, WebP + JPEG fallback
echo "hero"
if HERO=$(src_of hero); then
  if [ -n "$IM" ]; then
    for w in 720 1080 1440 2880; do
      $IM "$HERO" -resize "${w}x>" -strip -quality 82 "$IMG/hero-${w}.webp"
      $IM "$HERO" -resize "${w}x>" -strip -quality 82 -interlace Plane "$IMG/hero-${w}.jpg"
      echo "  ${w}w"
    done
  else
    python3 - "$HERO" "$IMG" <<'PY'
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src)
for w in (720, 1080, 1440, 2880):
    frame = im.copy()
    if frame.width > w:
        h = round(frame.height * w / frame.width)
        frame = frame.resize((w, h), Image.Resampling.LANCZOS)
    rgb = frame.convert("RGB")
    rgb.save(f"{out}/hero-{w}.webp", "WEBP", quality=82, method=6)
    rgb.save(f"{out}/hero-{w}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  {w}w")
PY
  fi
else
  echo "  missing: hero.(png|jpg) — export from Figma first, see ASSETS.md" >&2
fi

# footer: 2 widths — it's a background, it can afford less
echo "footer"
if FOOT=$(src_of footer-bg); then
  if [ -n "$IM" ]; then
    for w in 1440 2880; do
      $IM "$FOOT" -resize "${w}x>" -strip -quality 80 "$IMG/footer-bg-${w}.webp"
      $IM "$FOOT" -resize "${w}x>" -strip -quality 80 -interlace Plane "$IMG/footer-bg-${w}.jpg"
      echo "  ${w}w"
    done
  else
    python3 - "$FOOT" "$IMG" <<'PY'
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src)
for w in (1440, 2880):
    frame = im.copy()
    if frame.width > w:
        h = round(frame.height * w / frame.width)
        frame = frame.resize((w, h), Image.Resampling.LANCZOS)
    rgb = frame.convert("RGB")
    rgb.save(f"{out}/footer-bg-{w}.webp", "WEBP", quality=80, method=6)
    rgb.save(f"{out}/footer-bg-{w}.jpg", "JPEG", quality=80, optimize=True, progressive=True)
    print(f"  {w}w")
PY
  fi
else
  echo "  missing: footer-bg.(png|jpg)" >&2
fi

# Inner-page heroes: same four widths as home
echo "inner heroes"
for name in hero-contact hero-faqs hero-pricing \
            hero-pricing-squarespace hero-pricing-shopify \
            hero-pricing-vercel hero-pricing-netlify hero-pricing-cloudflare; do
  echo "  $name"
  if SRCIMG=$(src_of "$name"); then
    if [ -n "$IM" ]; then
      for w in 720 1080 1440 2880; do
        $IM "$SRCIMG" -resize "${w}x>" -strip -quality 82 "$IMG/${name}-${w}.webp"
        $IM "$SRCIMG" -resize "${w}x>" -strip -quality 82 -interlace Plane "$IMG/${name}-${w}.jpg"
      done
    else
      python3 - "$SRCIMG" "$IMG" "$name" <<'PY'
import sys
from PIL import Image
src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src)
for w in (720, 1080, 1440, 2880):
    frame = im.copy()
    if frame.width > w:
        h = round(frame.height * w / frame.width)
        frame = frame.resize((w, h), Image.Resampling.LANCZOS)
    rgb = frame.convert("RGB")
    rgb.save(f"{out}/{name}-{w}.webp", "WEBP", quality=82, method=6)
    rgb.save(f"{out}/{name}-{w}.jpg", "JPEG", quality=82, optimize=True, progressive=True)
PY
    fi
  else
    echo "    missing: $name.(png|jpg)" >&2
  fi
done

# UI panels: keep PNG (flat colour + fine text — JPEG will smear it),
# just strip metadata and re-compress losslessly.
echo "panels"
for f in panel-the-tools panel-get-a-quote panel-start-a-project arrow-02 squarespace-badges; do
  if P=$(src_of "$f"); then
    if [ -n "$IM" ]; then
      $IM "$P" -strip -define png:compression-level=9 "$IMG/$f.png"
    else
      python3 - "$P" "$IMG/$f.png" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1])
im.save(sys.argv[2], "PNG", optimize=True, compress_level=9)
PY
    fi
    echo "  $f"
  else
    echo "  missing: $f.png" >&2
  fi
done

echo
echo "Done. Sizes:"
du -h "$IMG"/*.{webp,jpg,png} 2>/dev/null | sort -h | tail -20

cat <<'EOF'

Sanity check before you commit:
  · No single file over ~300 KB. If hero-2880.webp is bigger, drop quality to 75.
  · Open hero-720.webp and confirm it isn't an upscale of something smaller.
  · The panel PNGs carry small text — view at 100% and check it's still legible.
EOF
