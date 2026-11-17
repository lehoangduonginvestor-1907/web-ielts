"""Ghép phần câu hỏi (q.json) với văn bản đã cắt (text.json) thành một đề hoàn chỉnh,
chép audio vào content/audio và cập nhật content/index.json.

Dùng:  python tools/assemble.py <q.json> <text.json> <audio-map.json>

audio-map.json: {"c17t1-l1.mp3": "D:/ielts-data/books/.../audio1.mp3", ...}
Hình của nhóm câu (trường "image" trong q.json) lấy từ thư mục images/ nằm cạnh q.json.
Mốc thời gian của transcript lấy từ timing/<id>.json cạnh q.json (sinh bằng work/align_timing.py), nếu có.
"""
import json
import os
import shutil
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content")


def unit(p):
    u = {"n": p["n"], "title": p["title"],
         "from": min(g["from"] for g in p["groups"]), "to": max(g["to"] for g in p["groups"])}
    if "audio" in p:  # phần nghe: có file audio trong content/audio chưa
        u["audio"] = os.path.exists(os.path.join(ROOT, "audio", p["audio"]))
    return u


def main():
    q = json.load(open(sys.argv[1], encoding="utf-8"))
    text = json.load(open(sys.argv[2], encoding="utf-8"))
    audio_map = json.load(open(sys.argv[3], encoding="utf-8")) if len(sys.argv) > 3 else {}

    paras = {p["n"]: p["paragraphs"] for p in text["passages"]}
    scripts = {s["n"]: s["segments"] for s in text["scripts"]}
    for p in q["reading"]:
        p["paragraphs"] = paras[p["n"]]
    for part in q["listening"]:
        part["script"] = scripts.get(part["n"], [])

    # Mốc thời gian từng từ: chỉ gắn khi số từ khớp đúng với transcript hiện tại
    timing_path = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "timing", f"{q['id']}.json")
    timing = json.load(open(timing_path, encoding="utf-8")) if os.path.exists(timing_path) else {}
    for part in q["listening"]:
        arrs = timing.get(str(part["n"]))
        segs = part["script"]
        if not arrs:
            continue
        if len(arrs) != len(segs) or any(len(a) != len(s["text"].split()) + 1 for a, s in zip(arrs, segs)):
            print(f"! {q['id']} Part {part['n']}: mốc thời gian không khớp transcript (chạy lại align_timing.py)")
            continue
        for s, a in zip(segs, arrs):
            s["ts"] = a

    os.makedirs(os.path.join(ROOT, "tests"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    out = os.path.join(ROOT, "tests", f"{q['id']}.json")
    json.dump(q, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    for name, src in audio_map.items():
        dst = os.path.join(ROOT, "audio", name)
        if not os.path.exists(dst) or os.path.getsize(dst) != os.path.getsize(src):
            shutil.copyfile(src, dst)

    # Hình bản đồ / sơ đồ của các nhóm câu
    img_src = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "images")
    for p in q["listening"] + q["reading"]:
        for g in p["groups"]:
            if g.get("image"):
                os.makedirs(os.path.join(ROOT, "images"), exist_ok=True)
                shutil.copyfile(os.path.join(img_src, g["image"]), os.path.join(ROOT, "images", g["image"]))

    # Mục lục các đề có trong máy
    index_path = os.path.join(ROOT, "index.json")
    index = json.load(open(index_path, encoding="utf-8")) if os.path.exists(index_path) else {"tests": []}
    entry = {
        "id": q["id"], "book": q["book"], "test": q["test"],
        "listening": [unit(p) for p in q["listening"]],
        "reading": [unit(p) for p in q["reading"]],
    }
    index["tests"] = sorted([t for t in index["tests"] if t["id"] != q["id"]] + [entry],
                            key=lambda t: (t["book"], t["test"]))
    json.dump(index, open(index_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("wrote", out)


if __name__ == "__main__":
    main()
