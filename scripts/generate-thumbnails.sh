#!/bin/sh
set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SOURCE_DIR="$ROOT_DIR/assets/images/artworks"
THUMB_DIR="$ROOT_DIR/assets/images/thumbs"
MAX_SIZE=360

if ! command -v sips >/dev/null 2>&1; then
  echo "sips is required to generate thumbnails on macOS." >&2
  exit 1
fi

mkdir -p "$THUMB_DIR"

for file in "$SOURCE_DIR"/*.png; do
  name=$(basename "$file")
  sips -Z "$MAX_SIZE" "$file" --out "$THUMB_DIR/$name" >/dev/null
done

echo "Generated thumbnails in $THUMB_DIR"
