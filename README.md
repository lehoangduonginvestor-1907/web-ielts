# SealIELTS — tự học IELTS

Web luyện đủ bốn kỹ năng IELTS cho một người học (và một người kèm). Reading và Listening luyện trên đề Cambridge: mỗi câu có dẫn chứng trích từ bài, dịch tiếng Việt, giải thích, cặp paraphrase và bẫy. Writing và Speaking được AI chấm theo bốn tiêu chí của IELTS. Kèm theo bài học kỹ năng, nhật ký, chuỗi ngày học, ôn từ vựng lặp lại ngắt quãng và sổ lỗi tự quay vòng. Giao diện tiếng Anh; lời giải đề và nghĩa từ vựng giữ tiếng Việt.

## Chạy

```bash
npm install
npm run dev -- -p 3100   # http://localhost:3100
```

`npm test` chạy test tự động (Vitest) cho phần logic trong `src/lib/`: chấm điểm, quy đổi band, lặp lại ngắt quãng, Sổ lỗi, chuỗi ngày và vé nghỉ, bậc thang mở phần khó, gộp tiến độ giữa hai máy. `npm run test:watch` để chạy lại mỗi khi sửa code.

`npm run validate` kiểm tra toàn bộ đề trong `content/`: đủ 40 câu, đủ đáp án, chỗ trống khớp số câu, và **câu dẫn chứng của mọi lời giải phải có thật trong bài đọc/transcript**.

## Tính năng

- **Hôm nay** (`/`): việc trong ngày (ôn thẻ đến hạn, một phần Listening, một bài Reading, làm lại câu sai), vòng mục tiêu phút, chuỗi 7 ngày, band ước tính, dạng câu hay sai.
- **Luyện đề** (`/practice`): theo cuốn / đề / phần. Lộ trình bậc thang cho người mới: Listening Part 1–2 và Reading Passage 1 trước; đạt trung bình 70% (3–5 lần gần nhất) thì mở phần khó hơn.
- **Phòng thi** (`/test/[id]/[listening|reading]?p=1,2`): chế độ luyện tập (tua, chỉnh tốc độ, không giờ) hoặc thi thử (audio chạy một lần và tự chuyển phần; Reading 20 phút/bài, hết giờ tự nộp). Tô sáng, lưu từ kèm câu ngữ cảnh, đánh dấu câu, lưu nháp tự động.
- **Xem lại**: điểm, band, độ chính xác theo dạng câu; mỗi câu có lời giải và nút "Xem trong bài" tô xanh câu dẫn chứng.
- **Sổ lỗi** (`/mistakes`): câu sai quay lại sau 1 → 3 → 7 ngày, đúng 3 lần thì gạch; gắn lý do sai và xem thống kê.
- **Từ vựng** (`/vocab`): thẻ từ lấy từ bài, ôn kiểu SM-2, phát âm bằng giọng có sẵn của trình duyệt.
- **Kỹ năng** (`/skills`): 24 bài học cách làm từng dạng câu (Reading, Listening, Writing, Speaking) kèm câu thử nhanh, và kho luyện theo dạng.
- **Writing** (`/writing`): đề Task 1 và Task 2 theo ba chế độ (viết theo đoạn có gợi ý, viết tự do, thi thử 20/40 phút). AI chấm bốn tiêu chí, chỉ ra câu cần sửa ngay trong bài, viết lại đoạn lên một band và gợi ý từ vựng.
- **Speaking** (`/speaking`): thi thử với giám khảo Gemini Live (nói chuyện trực tiếp), ghi âm cả buổi rồi AI nghe bản ghi để chấm bốn tiêu chí.
- **Nhật ký** (`/journal`): lịch nhiệt 18 tuần, phút học 14 ngày, tâm trạng, ghi chú, mốc thành tích; cài đặt và sao lưu/khôi phục dữ liệu.
- **Người kèm** (`/coach`): xem tiến độ của người học và để lại lời nhắn (khi đăng nhập bằng mã người kèm).

Chuỗi ngày: một ngày được tính khi làm xong ít nhất 1 phần, hoặc ôn ≥ 10 thẻ, hoặc học ≥ 10 phút. Cứ 7 ngày liên tiếp được 1 vé nghỉ (tối đa 2), tự dùng khi lỡ một ngày.

Dữ liệu học nằm trong `localStorage` của trình duyệt (khoá `ielts.v1`) để phản hồi tức thì, và được đồng bộ với máy chủ (`/api/progress`: `data/progress.json` khi chạy trên máy, Vercel Blob khi deploy). Học trên hai máy thì hai bản được gộp, không bản nào ghi đè bản nào. Vẫn có thể sao lưu tay ở *Nhật ký → Cài đặt*.

## AI chấm bài

Đặt khoá trong `.env.local` (xem `env.example`), hoặc nhập Gemini key ở *Nhật ký → Cài đặt* khi chạy trên máy.

| | Thứ tự model | Ghi chú |
| --- | --- | --- |
| Writing | Gemini 4 Hydrogen → Gemini 3.8 Flash → NVIDIA / Groq / OpenRouter | Model ngoài Gemini chỉ dùng khi cả hai Gemini lỗi |
| Speaking | Gemini 4 Hydrogen → Gemini 3.8 Flash | Cần model nghe được audio |

- Gemini quá tải (503) thì chuyển ngay sang model kế tiếp thay vì chờ thử lại.
- Kết quả thiếu điểm một tiêu chí bị coi là hỏng và chấm lại, không bao giờ âm thầm tính 0.
- Gửi lại đúng bài đó trong 30 phút (bấm *Retry* sau khi mất mạng…) thì dùng lại kết quả cũ, không tốn thêm lượt gọi model.
- Đổi tên model không cần sửa code: `WRITING_GEMINI_MODELS`, `SPEAKING_GRADE_MODELS`, `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_FAST_MODEL`.
- **Chấm bằng Gemini của mình** (nút *Grade with My Gemini*): copy prompt → dán vào panel Gemini của Chrome hoặc gemini.google.com → dán JSON trả về. Không tốn quota API; khi thử (21/11/2026) Gemini 4 Neon đối chiếu dữ liệu bản đồ kỹ hơn so với chấm qua API.

## Nội dung đề

Đề Cambridge có bản quyền: **không đưa `content/` lên git, không đặt trong `public/`, không deploy công khai**. Thư mục `content/` đã nằm trong `.gitignore`; audio được phát qua `/api/audio/[file]`.

```
content/
  index.json          mục lục (sinh tự động)
  tests/c17t1.json    một đề: listening[4] + reading[3]
  audio/c17t1-l1.mp3
```

### Nhập đề hàng loạt bằng Gemini (Antigravity)

Cách đang dùng cho các cuốn scan: Gemini đọc ảnh trang và soạn đề, script tự kiểm tra ba lớp, Claude chỉ xem những đề không đạt. Mọi thứ nằm ở `D:\ielts-data\` (`INVENTORY.md` ghi nguồn tốt nhất cho từng cuốn).

1. **Ảnh trang**: `python tools/render_pages.py <pdf> D:/ielts-data/pages/camNN` (150 dpi).
2. **Bản đồ trang + audio** (Gemini, theo `work/GEMINI_PAGEMAP.md`) → `work/pagemap/camNN.json`.
3. **Bảng đáp án chép độc lập** (Gemini, theo `work/GEMINI_KEYS.md`) → `work/keys/camNN.json`.
4. **Soạn đề** (Gemini, theo `work/GEMINI_JOB.md`; lời giao việc in bằng `python tools/gemini_task.py <book> <test>`) → `work/cNNtX.{text,q,audio}.json`.
5. **Kiểm tra**: `npm run validate` (cấu trúc + dẫn chứng có thật trong bài), `python tools/check_keys.py <book> <test>` (đáp án khớp bảng chép độc lập), `python tools/review_q.py <q.json>` (đủ dịch/paraphrase/bẫy, lời giải tiếng Việt).

`work/drive.sh` chạy tự động bước 3–5: giao đề trong `work/queue.txt` (tối đa 6 đề song song, `agy` cần `--print-timeout` dài vì mặc định chỉ 10 phút), tự chạy tiếp job bị cắt, và dừng để người xem khi có đề không đạt hoặc hết quota. Nhật ký ở `work/drive.log`. Job chạy dưới tiến trình Claude Code: tắt phiên thì job dừng, chạy lại `drive.sh` là nó tự nối tiếp.

Phần nghe chưa có audio vẫn được nhập (đề và lời giải đầy đủ), web tự ẩn khỏi luyện tập và hiện "chưa có audio".

### Thêm một đề bằng tay

Nguyên liệu nằm ngoài repo, ở `D:\ielts-data\`:

1. **Trích chữ** từ PDF (PyMuPDF) ra `work/camNN.txt`. Chỉ hợp với PDF có lớp chữ (Cam 1–3, 17); lớp chữ của Cam 11 có lỗi OCR.
2. **Spec cắt văn bản** `work/specs/cNNtX.json`: dải dòng của từng bài đọc / audioscript, tiền tố mở đầu mỗi đoạn, nhãn đoạn A–H. Chạy:
   `python tools/slice_text.py <spec> work/cNNtX.text.json`
3. **Câu hỏi + lời giải** `work/cNNtX.q.json`, theo mẫu `work/c17t1.q.json`. Dạng nhóm: `gap` (điền từ; mẫu hỗ trợ `#`, `##`, `**nhãn**`, `- `, `  - `, bảng `| ô |`; có `options` thì thành ô chọn chữ cái), `mcq`, `multi` (chọn HAI), `tfng`, `ynng`, `match`.
4. **Ghép**: `python tools/assemble.py work/cNNtX.q.json work/cNNtX.text.json work/cNNtX.audio.json`
5. `npm run validate`

Danh sách đề hiện có xem ở trang Luyện đề hoặc `content/index.json`.
