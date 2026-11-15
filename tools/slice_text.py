"""Cắt văn bản bài đọc / audioscript từ bản trích chữ của sách (PDF text hoặc OCR) thành JSON.

Dùng:  python tools/slice_text.py <spec.json> <out.json>

spec.json:
{
  "source": "D:/ielts-data/work/ocr/cam18.txt",
  "passages": [ {"n": 1, "ranges": [[605, 632], [637, 670]],
                 "starts": ["In the first half", ...],          # vài chữ đầu của MỖI đoạn
                 "labels": {"Stadiums are among": "A"},          # đoạn mở đầu một mục chữ cái
                 "drop": ["A", "B"]} ],                          # dòng cần bỏ (khớp nguyên dòng)
  "scripts":  [ {"n": 1, "ranges": [[3884, 3987]],
                 "speakers": ["JAN", "PETER"],                   # hội thoại: tên người nói như in trong sách
                 "starts": [...]} ],                             # độc thoại: vài chữ đầu mỗi đoạn
  "fixes": [["aeople", "people"], ["worid", "world"]]            # sửa lỗi OCR (cụm ngắn)
}

- Bỏ dòng rác của trang (=====PAGE, số trang, 'Test 1', 'READING PASSAGE 1', 'Q12', 'p. 119'...).
- Bỏ dòng chú thích bắt đầu bằng '*' trong bài đọc.
- Nối dòng: dòng kết thúc bằng '-' được nối liền (giữ dấu gạch), còn lại nối bằng dấu cách.
- Người nói: dòng 'peter:' đứng riêng (PDF text) hoặc 'PETER: Hello...' cùng dòng (OCR, cần khai 'speakers').
- Mốc câu hỏi ở lề audioscript (Q1, Q15/16) bị xoá.
In cảnh báo nếu một 'starts', 'labels' hay 'fixes' không khớp chỗ nào.
"""
import json
import re
import sys

JUNK = re.compile(
    r"^(=====PAGE \d+=====|\d{1,3}|Test ?\d|TEST ?\d|Reading|READING|Listening|LISTENING|Audioscripts|AUDIOSCRIPTS|"
    r"READING ?PASSAGE ?\d|PART ?\d|SECTION ?\d|(Q\s?\d+([/&]\d+)?\s*)+|.*p\. \d+.*|Listening test audio|"
    r".*(FB\.com|irLanguage|LouisQuang|ouisQuang).*)\s*$"
)
SPEAKER_LINE = re.compile(r"^([a-z][a-z .’']{0,30}):\s*$")
QMARK = re.compile(r"(?<![\w-])Q\s?[\dIl|]{1,2}(?:\s*[/&]\s*Q?[\dIl|]{1,2})?(?![\w-])")

warnings = []


def clean_lines(lines, a, b, drop=(), footnotes=False):
    out = []
    for i in range(a - 1, b):
        # PDF hay chèn ký tự điều khiển (vd. \x07) ở đầu đoạn
        s = re.sub(r"[\x00-\x08\x0b-\x1f]", "", lines[i].rstrip("\n")).replace("\t", " ").strip()
        if not s or JUNK.match(s) or s in drop:
            continue
        if footnotes and s.startswith("*"):
            continue
        if not footnotes:  # audioscript: bỏ nhãn "Example" ở lề phải
            s = re.sub(r"\s+Example$", "", s)
        out.append(s)
    return out


def join(parts):
    text = ""
    for p in parts:
        if not text:
            text = p
        elif text.endswith("-") and not text.endswith(" -"):
            text += p
        else:
            text += " " + p
    return re.sub(r"\s+", " ", text).strip()


def paragraphs(lines, starts, labels, n):
    used = set()
    paras, cur = [], []
    for s in lines:
        hit = next((st for st in starts if s.startswith(st)), None)
        if hit:
            used.add(hit)
            if cur:
                paras.append(cur)
                cur = []
        cur.append(s)
    if cur:
        paras.append(cur)
    for st in starts:
        if st not in used:
            warnings.append(f"passage {n}: start not found at a line start: {st!r}")
    out = []
    seen_labels = set()
    for p in paras:
        text = join(p)
        item = {"text": text}
        for prefix, lab in labels.items():
            if text.startswith(prefix):
                item = {"label": lab, "text": text}
                seen_labels.add(prefix)
        out.append(item)
    for prefix in labels:
        if prefix not in seen_labels:
            warnings.append(f"passage {n}: label prefix not found at a paragraph start: {prefix!r}")
    return out


def script(lines, starts, speakers, n):
    """Hội thoại: tách theo người nói; độc thoại: tách theo 'starts'."""
    inline = None
    if speakers:
        names = "|".join(re.escape(x) for x in sorted(speakers, key=len, reverse=True))
        inline = re.compile(rf"^({names})\s*[:;]\s*(.*)$", re.I)
    segs, speaker, cur = [], None, []

    def flush():
        if cur:
            text = QMARK.sub("", join(cur))
            seg = {"text": re.sub(r"\s+", " ", text).strip()}
            if speaker:
                seg["speaker"] = speaker
            if seg["text"]:
                segs.append(seg)

    for s in lines:
        m = SPEAKER_LINE.match(s)
        if m:
            flush()
            cur = []
            speaker = m.group(1).strip().upper()
            continue
        m = inline.match(s) if inline else None
        if m:
            flush()
            cur = [m.group(2)] if m.group(2) else []
            speaker = m.group(1).strip().upper()
            continue
        if not speakers and speaker is None and any(s.startswith(st) for st in starts) and cur:
            flush()
            cur = []
        cur.append(s)
    flush()
    if speakers:
        found = {x["speaker"] for x in segs if "speaker" in x}
        for sp in speakers:
            if sp.upper() not in found:
                warnings.append(f"script {n}: speaker never found: {sp!r}")
    return segs


def apply_fixes(out, fixes):
    for wrong, right in fixes:
        hits = 0
        for p in out["passages"]:
            for x in p["paragraphs"]:
                hits += x["text"].count(wrong)
                x["text"] = x["text"].replace(wrong, right)
        for s in out["scripts"]:
            for x in s["segments"]:
                hits += x["text"].count(wrong)
                x["text"] = x["text"].replace(wrong, right)
        if not hits:
            warnings.append(f"fix not used: {wrong!r}")


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    lines = open(spec["source"], encoding="utf-8").readlines()
    out = {"passages": [], "scripts": []}
    for p in spec.get("passages", []):
        ls = []
        for a, b in p["ranges"]:
            ls += clean_lines(lines, a, b, set(p.get("drop", [])), footnotes=True)
        out["passages"].append({"n": p["n"], "paragraphs": paragraphs(ls, p["starts"], p.get("labels", {}), p["n"])})
    for s in spec.get("scripts", []):
        ls = []
        for a, b in s["ranges"]:
            ls += clean_lines(lines, a, b, set(s.get("drop", [])))
        out["scripts"].append({"n": s["n"], "segments": script(ls, s.get("starts", []), s.get("speakers", []), s["n"])})
    apply_fixes(out, spec.get("fixes", []))
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for p in out["passages"]:
        print("passage", p["n"], len(p["paragraphs"]), "paras")
    for s in out["scripts"]:
        print("script", s["n"], len(s["segments"]), "segments")
    for w in warnings:
        print("WARN", w)


if __name__ == "__main__":
    main()
