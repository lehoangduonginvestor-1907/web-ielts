"""Soát định dạng các bài học trong src/content/learn/*.md (bộ đọc ở src/lib/learnParse.ts).

Dùng: python tools/check_lessons.py
"""
import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "content", "learn")
KINDS = {"rule", "tip", "trap", "note", "steps", "examples", "check"}
bad = 0


def err(name, msg):
    global bad
    bad += 1
    print(f"✗ {name}: {msg}")


files = sorted(glob.glob(os.path.join(ROOT, "*.md")))
for f in files:
    name = os.path.basename(f)
    text = open(f, encoding="utf-8").read().replace("\r\n", "\n")
    lines = text.split("\n")
    if lines[0].startswith("#"):
        err(name, "bài không được mở đầu bằng tiêu đề")
    if re.search(r"^# ", text, re.M):
        err(name, "không dùng tiêu đề cấp 1 (#)")
    if "```" in text or re.search(r"<[a-z]+[ >]", text):
        err(name, "có code fence hoặc HTML")
    if "—" in text:
        err(name, f"có {text.count('—')} dấu gạch dài (—)")
    # Khối :::
    stack, counts, check = [], {}, None
    for i, line in enumerate(lines, 1):
        s = line.strip()
        m = re.match(r"^:::(\w+)", s)
        if m:
            if m.group(1) not in KINDS:
                err(name, f"dòng {i}: không có khối :::{m.group(1)}")
            if stack and stack[-1] in ("examples", "check"):
                err(name, f"dòng {i}: khối lồng trong :::{stack[-1]}")
            stack.append(m.group(1))
            counts[m.group(1)] = counts.get(m.group(1), 0) + 1
            if m.group(1) == "check":
                check = {"line": i, "right": 0, "opts": 0, "why": 0}
        elif s == ":::":
            if not stack:
                err(name, f"dòng {i}: ':::' thừa")
                continue
            kind = stack.pop()
            if kind == "check":
                if check["right"] != 1 or check["opts"] < 2:
                    err(name, f"câu thử nhanh ở dòng {check['line']}: cần ≥2 lựa chọn và đúng một [x]")
                if not check["why"]:
                    err(name, f"câu thử nhanh ở dòng {check['line']}: thiếu giải thích (>)")
        elif stack and stack[-1] == "check":
            o = re.match(r"^- \[( |x)\] ", line)
            if o:
                check["opts"] += 1
                check["right"] += o.group(1) == "x"
            elif line.startswith(">"):
                check["why"] += 1
        elif stack and stack[-1] == "examples" and s and s[0] not in "✓✗":
            err(name, f"dòng {i}: dòng ví dụ phải bắt đầu bằng ✓ hoặc ✗")
        # Định dạng lồng nhau (đậm trong nghiêng) làm hỏng hiển thị
        if re.search(r"(?<!\*)\*(?!\*)[^*\n]*\*\*[^*\n]+\*\*[^*\n]*(?<!\*)\*(?!\*)", line) and line.count("*") % 2 == 0:
            flat = re.sub(r"\*\*[^*]+\*\*", "", line)
            if flat.count("*") % 2 == 0 and re.search(r"\*[^*\s][^*]*$", re.split(r"\*\*[^*]+\*\*", line)[0]):
                err(name, f"dòng {i}: in đậm lồng trong in nghiêng")
    if stack:
        err(name, f"khối :::{stack[-1]} chưa đóng")
    for need, n in (("steps", 1), ("trap", 1), ("check", 2)):
        if counts.get(need, 0) < n:
            err(name, f"cần ít nhất {n} khối :::{need} (đang có {counts.get(need, 0)})")
    if not (counts.get("examples") or re.search(r"^\|", text, re.M)):
        err(name, "cần một bảng hoặc khối :::examples")
    words = len(re.findall(r"\S+", re.sub(r"[:|>*\[\]#-]", " ", text)))
    flag = "" if 500 <= words <= 1100 else "  ← ngoài khoảng 500–1100"
    print(f"  {name}: {words} từ{flag}")

print(f"\n{len(files)} bài · {bad} lỗi")
sys.exit(1 if bad else 0)
