"""Chấm nhanh chất lượng một file đề (q.json) do máy soạn, trước khi đưa vào web.

Dùng: python tools/review_q.py D:/ielts-data/work/c11t1.q.json [--show N]

In ra số câu, tỷ lệ có vi/para/trap, độ dài trung bình, và các câu đáng ngờ:
lời giải không có dấu tiếng Việt, dẫn chứng quá dài/quá ngắn, lời giải quá ngắn,
đáp án NOT GIVEN mà giải thích không nói "không" ... --show N in thêm N câu ngẫu nhiên để đọc.
"""
import json
import random
import re
import sys

VI = re.compile(r"[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹáàãéèíìóòõúùýđ]", re.I)


def main():
    path = sys.argv[1]
    show = int(sys.argv[sys.argv.index("--show") + 1]) if "--show" in sys.argv else 0
    q = json.load(open(path, encoding="utf-8"))
    rows = []
    for sec in ("listening", "reading"):
        for u in q.get(sec, []):
            for g in u["groups"]:
                for x in g["questions"]:
                    rows.append((sec, u["n"], g, x))
    n = len(rows)
    has = {k: sum(1 for *_, x in rows if x.get("explain", {}).get(k)) for k in ("evidence", "vi", "why", "para", "trap")}
    why_len = sum(len(x.get("explain", {}).get("why", "")) for *_, x in rows) / max(1, n)
    print(f"{path}\n  {n} câu · evidence {has['evidence']} · vi {has['vi']} · why {has['why']} · para {has['para']} · trap {has['trap']} · why TB {why_len:.0f} ký tự")
    vocab = [len(u.get("vocab", [])) for u in q.get("reading", [])]
    print(f"  vocab theo bài đọc: {vocab}")
    flags = []
    for sec, un, g, x in rows:
        ex = x.get("explain") or {}
        tag = f"{sec[0].upper()}{un} Q{x['n']} [{g['kind']}] đáp án {x['answer']}"
        why = ex.get("why", "")
        ev = ex.get("evidence", "")
        if not ex:
            flags.append(f"{tag}: thiếu lời giải")
            continue
        if len(why) > 70 and not VI.search(why):
            flags.append(f"{tag}: lời giải không phải tiếng Việt")
        if len(why) < 40:
            flags.append(f"{tag}: lời giải quá ngắn: {why!r}")
        if ev and len(ev) > 320:
            flags.append(f"{tag}: dẫn chứng dài {len(ev)} ký tự")
        if ev and len(ev) < 12:
            flags.append(f"{tag}: dẫn chứng quá ngắn: {ev!r}")
        if x["answer"] and x["answer"][0] in ("NOT GIVEN",) and not re.search(r"không", why, re.I):
            flags.append(f"{tag}: NOT GIVEN nhưng lời giải không nói bài 'không' đề cập")
        group_trap = any((y.get("explain") or {}).get("trap") for y in g["questions"])
        if g["kind"] == "mcq" and not ex.get("trap") or g["kind"] == "multi" and not group_trap and x is g["questions"][0]:
            flags.append(f"{tag}: trắc nghiệm nhưng không phân tích bẫy")
    print(f"  {len(flags)} điểm cần xem:")
    for f in flags:
        print("   -", f)
    for sec, un, g, x in random.sample(rows, min(show, n)):
        ex = x.get("explain", {})
        print(f"\n--- {sec[0].upper()}{un} Q{x['n']} {g['type']} → {x['answer']}")
        print("  prompt:", x.get("prompt") or g.get("prompt") or "(gap)")
        for k in ("evidence", "vi", "why", "para", "trap"):
            if ex.get(k):
                print(f"  {k}: {ex[k]}")


if __name__ == "__main__":
    main()
