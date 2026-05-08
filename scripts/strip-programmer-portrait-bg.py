#!/usr/bin/env python3
"""
Remove baked-in checkerboard / flat backdrop from programmer portrait PNGs.
Exports real RGBA PNG (fixes mislabeled WebP-as-.png as well).
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


def is_background_pixel(r: int, g: int, b: int) -> bool:
    """Light, low-chroma pixels typical of white/light-gray checker export."""
    spread = max(r, g, b) - min(r, g, b)
    mean = (r + g + b) / 3
    if spread > 38:
        return False
    return mean >= 188


def flood_background_transparent(rgba: np.ndarray) -> np.ndarray:
    h, w = rgba.shape[:2]
    out = rgba.copy()
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h or visited[y, x]:
            return
        r, g, b = out[y, x, :3]
        if not is_background_pixel(int(r), int(g), int(b)):
            return
        visited[y, x] = True
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        out[y, x, 3] = 0
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            push(nx, ny)

    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    jp = root / "public" / "images" / "characters" / "japanese"
    for name in ("hana.png", "kenji.png", "yuki.png"):
        path = jp / name
        if not path.exists():
            print("skip missing", path)
            continue
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        arr = flood_background_transparent(arr)
        out = Image.fromarray(arr)
        out.save(path, format="PNG", optimize=True)
        print("wrote", path)


if __name__ == "__main__":
    main()
