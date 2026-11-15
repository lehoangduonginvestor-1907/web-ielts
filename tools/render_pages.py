"""Xuất mỗi trang PDF thành ảnh PNG để Gemini đọc (OCR đa phương thức).

Dùng: python tools/render_pages.py <file.pdf> <thư mục ra> [dpi]
"""
import os
import sys

import pymupdf

pdf, out = sys.argv[1], sys.argv[2]
dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 150
os.makedirs(out, exist_ok=True)
doc = pymupdf.open(pdf)
for i, page in enumerate(doc):
    path = os.path.join(out, f"p{i + 1:03d}.png")
    if not os.path.exists(path):
        page.get_pixmap(dpi=dpi).save(path)
print(f"{doc.page_count} trang -> {out}")
