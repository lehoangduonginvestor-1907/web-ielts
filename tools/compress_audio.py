"""Nén audio cho bản chạy trên mạng: mọi file trong content/audio -> content/audio-web/<cùng tên>,
MP3 mono 48 kbps (đủ rõ cho giọng nói), để cả kho nằm gọn trong 1 GB của Vercel Blob.
Tên file giữ nguyên (kể cả đuôi .m4a/.wav) vì đề tham chiếu theo tên; kiểu nội dung thật là audio/mpeg.

Dùng (cần PyAV):  D:/ielts-data/whisper-venv/Scripts/python.exe tools/compress_audio.py
"""
import glob
import os
import sys

import av

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content")
SRC, DST = os.path.join(ROOT, "audio"), os.path.join(ROOT, "audio-web")
os.makedirs(DST, exist_ok=True)


def convert(src, dst):
    tmp = dst + ".part"
    with av.open(src) as inp, av.open(tmp, "w", format="mp3") as out:
        rate = min(inp.streams.audio[0].codec_context.sample_rate, 24000)
        rate = 24000 if rate > 16000 else 16000 if rate > 8000 else 8000
        stream = out.add_stream("libmp3lame", rate=rate)
        stream.bit_rate = 48000 if rate > 8000 else 24000
        stream.layout = "mono"
        resampler = av.AudioResampler(format=stream.format, layout="mono", rate=rate)
        for frame in inp.decode(audio=0):
            frame.pts = None
            for f in resampler.resample(frame):
                out.mux(stream.encode(f))
        for f in resampler.resample(None):
            out.mux(stream.encode(f))
        out.mux(stream.encode(None))
    os.replace(tmp, dst)


files = sorted(glob.glob(os.path.join(SRC, "*")))
total_in = total_out = 0
for i, src in enumerate(files, 1):
    dst = os.path.join(DST, os.path.basename(src))
    if not os.path.exists(dst):
        try:
            convert(src, dst)
        except Exception as e:  # noqa: BLE001
            print("LỖI", os.path.basename(src), e, flush=True)
            continue
    total_in += os.path.getsize(src)
    total_out += os.path.getsize(dst)
    if i % 20 == 0 or i == len(files):
        print(f"{i}/{len(files)}  {total_in / 1e6:.0f} MB -> {total_out / 1e6:.0f} MB", flush=True)
sys.exit(0)
