"""In lời giao việc cho Gemini (Antigravity) để chuyển một đề, dựa trên bản đồ trang của cuốn sách.

Dùng: python tools/gemini_task.py <book> <test>
   vd. python tools/gemini_task.py 18 2  → in prompt cho c18t2

Cần có D:/ielts-data/work/pagemap/camNN.json (do job GEMINI_PAGEMAP.md tạo ra).
"""
import json
import sys

book, test = int(sys.argv[1]), int(sys.argv[2])
pm = json.load(open(f"D:/ielts-data/work/pagemap/cam{book}.json", encoding="utf-8"))
t = next(x for x in pm["tests"] if x["test"] == test)
tid = f"c{book}t{test}"
rng = lambda r: f"p{r[0]:03d} to p{r[1]:03d}"  # noqa: E731

audio_lines = []
missing = []
for i, a in enumerate(t.get("audio") or [None] * 4, start=1):
    if a:
        audio_lines.append(f"  - Part {i}: {a}")
    else:
        missing.append(i)
audio = "\n".join(audio_lines) or "  (none)"
miss = ""
if missing:
    parts = ", ".join(str(i) for i in missing)
    miss = (f"\nParts {parts} have no audio: leave them out of the audio map, but still set each listening part's "
            f"\"audio\" to {tid}-lN.mp3. A 'chưa có audio' warning from the validator is expected for them.")

print(f"""Read D:/ielts-data/work/GEMINI_JOB.md completely and follow it exactly for test id {tid} (Cambridge IELTS {book}, Test {test}).

Inputs:
- Full OCR text of the book, made locally (use 1-based line numbers): D:/ielts-data/work/ocr/cam{book}.txt
  Its =====PAGE n===== markers match the page image numbers below.
- Page images (for layout and checking): D:/ielts-data/pages/cam{book}/pNNN.png
  - Listening question pages: {rng(t['listening'])}
  - Reading pages: {rng(t['reading'])}
  - Audioscript pages: {rng(t['audioscript'])} (only the part belonging to Test {test})
  - Answer key pages: {rng(t['keys'])} (only Test {test})
- Audio files (keep each file's own extension in the map):
{audio}{miss}

Write D:/ielts-data/work/specs/{tid}.json and run the slicer to produce {tid}.text.json, then write {tid}.q.json and {tid}.audio.json. From D:/web-ielts, run the verify commands until the validator shows no error line for {tid}, then give the final report.""")
