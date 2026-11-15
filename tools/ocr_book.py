"""OCR một cuốn sách scan ngay trên máy (RapidOCR, chạy offline) thành file chữ theo trang.

Dùng: python tools/ocr_book.py <file.pdf> <ra.txt> [trang_đầu trang_cuối] [--dpi 250]
Định dạng ra giống bản trích chữ của Cam 17:  =====PAGE n=====  rồi từng dòng chữ theo thứ tự đọc.
Trang hai cột được đọc hết cột trái rồi mới sang cột phải; dòng tràn qua giữa trang (tiêu đề) giữ nguyên chỗ.
"""
import os
import sys

import numpy as np
import onnxruntime as ort
import pymupdf

# Giới hạn số luồng mỗi phiên onnxruntime (mặc định nó chiếm hết các nhân, chạy song song sẽ tranh nhau)
_THREADS = int(os.environ.get("OCR_THREADS", "4"))
_Session = ort.InferenceSession


def _limited_session(path, sess_options=None, *args, **kwargs):
    so = sess_options or ort.SessionOptions()
    so.intra_op_num_threads = _THREADS
    so.inter_op_num_threads = 1
    return _Session(path, sess_options=so, *args, **kwargs)


ort.InferenceSession = _limited_session

from rapidocr_onnxruntime import RapidOCR  # noqa: E402  (import sau khi vá onnxruntime)


def reading_order(items, width):
    """items: list of (x0, y0, x1, y1, text). Trả về các dòng chữ theo thứ tự đọc."""
    if not items:
        return []
    mid = width / 2
    heights = sorted(y1 - y0 for x0, y0, x1, y1, _ in items)
    lh = heights[len(heights) // 2] or 10
    # Gộp các mảnh cùng hàng (tâm y gần nhau)
    items = sorted(items, key=lambda b: ((b[1] + b[3]) / 2, b[0]))
    rows = []
    for b in items:
        cy = (b[1] + b[3]) / 2
        if rows and abs(rows[-1]["cy"] - cy) < lh * 0.5:
            rows[-1]["boxes"].append(b)
        else:
            rows.append({"cy": cy, "boxes": [b]})
    left_only = sum(1 for b in items if b[2] < mid)
    right_only = sum(1 for b in items if b[0] > mid)
    two_col = left_only > len(items) * 0.25 and right_only > len(items) * 0.25

    out = []
    pend_l, pend_r = [], []

    def flush():
        out.extend(pend_l)
        out.extend(pend_r)
        pend_l.clear()
        pend_r.clear()

    for r in rows:
        boxes = sorted(r["boxes"], key=lambda b: b[0])
        if not two_col:
            out.append(" ".join(b[4] for b in boxes))
            continue
        spans = any(b[0] < mid - width * 0.02 and b[2] > mid + width * 0.02 for b in boxes)
        if spans:
            flush()
            out.append(" ".join(b[4] for b in boxes))
            continue
        left = [b[4] for b in boxes if b[2] <= mid + width * 0.02]
        right = [b[4] for b in boxes if b[2] > mid + width * 0.02]
        if left:
            pend_l.append(" ".join(left))
        if right:
            pend_r.append(" ".join(right))
    flush()
    return out


def rapid_items(engine, pix):
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img = img[:, :, :3]
    result, _ = engine(img)
    items = []
    for box, text, score in result or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        items.append((min(xs), min(ys), max(xs), max(ys), text))
    return items


def windows_engine():
    """OCR có sẵn của Windows (Windows.Media.Ocr, tiếng Anh): tách từ chuẩn, giữ dấu cách."""
    import asyncio

    from winrt.windows.globalization import Language
    from winrt.windows.graphics.imaging import BitmapDecoder
    from winrt.windows.media.ocr import OcrEngine
    from winrt.windows.storage.streams import DataWriter, InMemoryRandomAccessStream

    engine = OcrEngine.try_create_from_language(Language("en-US"))

    async def run(png: bytes):
        stream = InMemoryRandomAccessStream()
        writer = DataWriter(stream)
        writer.write_bytes(png)
        await writer.store_async()
        stream.seek(0)
        decoder = await BitmapDecoder.create_async(stream)
        bitmap = await decoder.get_software_bitmap_async()
        result = await engine.recognize_async(bitmap)
        items = []
        for line in result.lines:
            rects = [w.bounding_rect for w in line.words]
            if not rects:
                continue
            x0 = min(r.x for r in rects)
            y0 = min(r.y for r in rects)
            x1 = max(r.x + r.width for r in rects)
            y1 = max(r.y + r.height for r in rects)
            items.append((x0, y0, x1, y1, line.text))
        return items

    return lambda pix: asyncio.run(run(pix.tobytes("png")))


def main():
    pdf, out_path = sys.argv[1], sys.argv[2]
    args = [a for a in sys.argv[3:] if not a.startswith("--") and not a.isalpha()]
    dpi = int(sys.argv[sys.argv.index("--dpi") + 1]) if "--dpi" in sys.argv else 250
    kind = sys.argv[sys.argv.index("--engine") + 1] if "--engine" in sys.argv else "win"
    doc = pymupdf.open(pdf)
    first = int(args[0]) if args else 1
    last = int(args[1]) if len(args) > 1 else doc.page_count
    if kind == "win":
        ocr = windows_engine()
    else:
        rapid = RapidOCR()
        ocr = lambda pix: rapid_items(rapid, pix)  # noqa: E731
    with open(out_path, "w", encoding="utf-8") as f:
        for pno in range(first, last + 1):
            pix = doc[pno - 1].get_pixmap(dpi=dpi)
            items = ocr(pix)
            f.write(f"\n=====PAGE {pno}=====\n")
            f.write("\n".join(reading_order(items, pix.width)) + "\n")
            print(f"page {pno}: {len(items)} lines", flush=True)


if __name__ == "__main__":
    main()
