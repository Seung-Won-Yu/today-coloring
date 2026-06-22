#!/usr/bin/env python3
"""Generate paint-frame region label maps and line overlays for fixed artwork assets."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ARTWORK_DIR = ROOT / "assets" / "images" / "artworks"
OUT_DIR = ROOT / "assets" / "regionmaps" / "paint"
LINE_OUT_DIR = ROOT / "assets" / "linelayers" / "paint"
MANIFEST_PATH = OUT_DIR / "manifest.json"

LINE_ALPHA_WHITE_POINT = 248.0
LINE_ALPHA_GAIN = 1.38
HARD_LINE_LUMINANCE = 112.0
LINE_CHROMA_LIMIT = 72.0
PAINT_MAX_SIDE = 900


def luminance(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def paint_frame(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    white.alpha_composite(rgba)
    width, height = white.size
    scale = min(PAINT_MAX_SIDE, max(width, height)) / max(width, height)
    out_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return white.convert("RGB").resize(out_size, Image.Resampling.LANCZOS)


def hard_line_neighbors(hard_line: np.ndarray, radius: int = 2) -> np.ndarray:
    height, width = hard_line.shape
    padded = np.pad(hard_line, radius, mode="constant", constant_values=False)
    neighbors = np.zeros_like(hard_line, dtype=bool)
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            y0 = radius + dy
            x0 = radius + dx
            neighbors |= padded[y0 : y0 + height, x0 : x0 + width]
    return neighbors


def fillable_mask(frame: Image.Image) -> np.ndarray:
    arr = np.asarray(frame.convert("RGBA"), dtype=np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    max_rgb = rgb.max(axis=2)
    min_rgb = rgb.min(axis=2)
    chroma = max_rgb - min_rgb
    lum = luminance(rgb)
    visible = alpha >= 50
    white_base = visible & (min_rgb > 238) & (lum > 247) & (chroma < 28)
    hard_line = visible & (lum <= HARD_LINE_LUMINANCE) & (chroma <= LINE_CHROMA_LIMIT)
    raw_line_alpha = np.clip(np.rint((LINE_ALPHA_WHITE_POINT - lum) * LINE_ALPHA_GAIN), 0, 255)
    skip_near_white = (min_rgb >= 246) & (lum >= 248) & (chroma <= 18)
    soft_candidate = (
        visible
        & ~hard_line
        & ~skip_near_white
        & (chroma <= LINE_CHROMA_LIMIT)
        & (lum > HARD_LINE_LUMINANCE)
        & (lum < LINE_ALPHA_WHITE_POINT)
    )
    soft_line = soft_candidate & hard_line_neighbors(hard_line) & (raw_line_alpha > 0)
    return white_base | soft_line


def line_alpha_mask(frame: Image.Image) -> np.ndarray:
    arr = np.asarray(frame.convert("RGBA"), dtype=np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3]
    max_rgb = rgb.max(axis=2)
    min_rgb = rgb.min(axis=2)
    chroma = max_rgb - min_rgb
    lum = luminance(rgb)
    visible = alpha >= 50
    hard_line = visible & (lum <= HARD_LINE_LUMINANCE) & (chroma <= LINE_CHROMA_LIMIT)
    raw_line_alpha = np.clip(np.rint((LINE_ALPHA_WHITE_POINT - lum) * LINE_ALPHA_GAIN), 0, 255).astype(np.uint8)
    skip_near_white = (min_rgb >= 246) & (lum >= 248) & (chroma <= 18)
    soft_candidate = (
        visible
        & ~hard_line
        & ~skip_near_white
        & (chroma <= LINE_CHROMA_LIMIT)
        & (lum > HARD_LINE_LUMINANCE)
        & (lum < LINE_ALPHA_WHITE_POINT)
    )
    soft_line = soft_candidate & hard_line_neighbors(hard_line) & (raw_line_alpha > 0)
    return np.where(hard_line | soft_line, raw_line_alpha, 0).astype(np.uint8)


def encode_line_layer(frame: Image.Image) -> Image.Image:
    alpha = line_alpha_mask(frame)
    rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    rgba[..., 3] = alpha
    return Image.fromarray(rgba)


def label_regions(mask: np.ndarray) -> tuple[np.ndarray, list[dict[str, int | bool]]]:
    height, width = mask.shape
    labels = np.zeros((height, width), dtype=np.uint32)
    regions: list[dict[str, int | bool]] = []
    next_label = 1
    for y in range(height):
        for x in range(width):
            if not mask[y, x] or labels[y, x] != 0:
                continue
            label = next_label
            next_label += 1
            queue: deque[tuple[int, int]] = deque([(x, y)])
            labels[y, x] = label
            size = 0
            min_x = max_x = x
            min_y = max_y = y
            is_background = False
            while queue:
                cx, cy = queue.popleft()
                size += 1
                min_x = min(min_x, cx)
                min_y = min(min_y, cy)
                max_x = max(max_x, cx)
                max_y = max(max_y, cy)
                if cx <= 35 or cy <= 35 or cx >= width - 36 or cy >= height - 36:
                    is_background = True
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or nx >= width or ny < 0 or ny >= height:
                        continue
                    if labels[ny, nx] != 0 or not mask[ny, nx]:
                        continue
                    labels[ny, nx] = label
                    queue.append((nx, ny))
            regions.append(
                {
                    "label": int(label),
                    "x": int(x),
                    "y": int(y),
                    "size": int(size),
                    "isBackground": bool(is_background),
                    "minX": int(min_x),
                    "minY": int(min_y),
                    "maxX": int(max_x),
                    "maxY": int(max_y),
                }
            )
    return labels, regions


def encode_labels(labels: np.ndarray) -> Image.Image:
    rgb = np.zeros((*labels.shape, 3), dtype=np.uint8)
    rgb[..., 0] = labels & 255
    rgb[..., 1] = (labels >> 8) & 255
    rgb[..., 2] = (labels >> 16) & 255
    return Image.fromarray(rgb)


def generate() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    LINE_OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "mode": "paint", "maps": []}
    for artwork_path in sorted(ARTWORK_DIR.glob("vertical-*.webp")):
        frame = paint_frame(Image.open(artwork_path))
        labels, regions = label_regions(fillable_mask(frame))
        output_name = artwork_path.with_suffix(".png").name
        output_path = OUT_DIR / output_name
        line_output_path = LINE_OUT_DIR / output_name
        encode_labels(labels).save(output_path, optimize=True)
        encode_line_layer(frame).save(line_output_path, optimize=True)
        manifest["maps"].append(
            {
                "id": artwork_path.stem,
                "file": output_name,
                "lineLayerFile": output_name,
                "width": frame.width,
                "height": frame.height,
                "regions": len(regions),
                "paintablePixels": int((labels > 0).sum()),
            }
        )
        print(f"{artwork_path.name}: {frame.width}x{frame.height}, {len(regions)} regions")
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    generate()
