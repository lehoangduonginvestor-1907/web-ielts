"""So đáp án trong file đề (q.json) với bảng đáp án chép độc lập (keys/camNN.json).

Dùng: python tools/check_keys.py <book> <test>   vd. python tools/check_keys.py 18 1
In các câu lệch; không in gì thêm nghĩa là khớp hết.
"""
import json
import re
import sys

book, test = sys.argv[1], sys.argv[2]
q = json.load(open(f"D:/ielts-data/work/c{book}t{test}.q.json", encoding="utf-8"))
keys = json.load(open(f"D:/ielts-data/work/keys/cam{book}.json", encoding="utf-8"))["tests"][str(test)]


def norm(s):
    s = re.sub(r"\s+", " ", s.lower().replace("’", "'").replace("£", ""))
    return re.sub(r"\s+([,;.])", r"\1", s).strip(" .")


def expand(printed):
    """'(the) ferry / boat' → {'ferry', 'the ferry', 'boat'}; 'B, E' → {'b', 'e'}"""
    out = set()
    for alt in re.split(r"\s*/\s*|\s+or\s+", printed):
        alt = alt.strip()
        if not alt:
            continue
        bare = re.sub(r"\([^)]*\)", "", alt)
        full = alt.replace("(", "").replace(")", "")
        out |= {norm(bare), norm(full)}
    return {x for x in out if x}


bad = 0
total = 0
for sec in ("listening", "reading"):
    mine = {}
    for u in q[sec]:
        for g in u["groups"]:
            for x in g["questions"]:
                mine[x["n"]] = x["answer"]
    for k, printed in keys[sec].items():
        nums = [int(n) for n in re.findall(r"\d+", k)]
        if len(nums) > 1:  # cặp IN EITHER ORDER
            want = {norm(p) for p in re.split(r"[,&\s]+", printed) if p.strip()}
            for n in nums:
                total += 1
                got = {norm(a) for a in mine.get(n, [])}
                if got != want:
                    bad += 1
                    print(f"  ✗ {sec[0].upper()}{n}: đề có {sorted(got)} · sách in {printed!r}")
            continue
        n = nums[0]
        total += 1
        got = {norm(a) for a in mine.get(n, [])}
        want = expand(printed)
        # khớp nếu đáp án chính của sách nằm trong danh sách chấp nhận của đề
        if not got or not (want & got):
            bad += 1
            print(f"  ✗ {sec[0].upper()}{n}: đề có {sorted(got)} · sách in {printed!r}")
print(f"c{book}t{test}: {total - bad}/{total} câu khớp bảng đáp án")
