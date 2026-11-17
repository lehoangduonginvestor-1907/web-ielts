# Đưa "đều." lên Vercel (một người học + một người kèm)

App chạy được theo hai kiểu, cùng một mã nguồn:

| | Trên máy riêng | Trên Vercel |
| --- | --- | --- |
| Đề, hình, audio | thư mục `content/` | kho Vercel Blob **riêng tư**, khoá `content/...` |
| Tiến độ học | `data/progress.json` (+ `data/backup/`) | cùng kho Blob, khoá `data/...` |
| Khoá vào cửa | không (khi không đặt `LEARNER_CODE`) | hai mã: người học và người kèm |

Kho đề không bao giờ nằm trong git. Trình duyệt chỉ nhận đề và audio qua các route `/api/...`, và các route này tự kiểm tra cookie đăng nhập.

## Các bước (làm một lần)

1. **Nén audio** (991 MB → khoảng 400 MB, để vừa 1 GB miễn phí của Blob):
   `D:/ielts-data/whisper-venv/Scripts/python.exe tools/compress_audio.py`
2. **Tạo project trên Vercel** trỏ vào repo GitHub `web-ielts` (Framework: Next.js, giữ mặc định).
3. **Tạo kho Blob riêng tư**: project → Storage → Create → Blob → chọn **Private**, vùng Singapore, và **tick "Add a read-write token env var"** (app cần `BLOB_READ_WRITE_TOKEN`; mặc định Vercel chỉ thêm `BLOB_STORE_ID`).
4. **Đặt ba biến môi trường** (Settings → Environment Variables): `LEARNER_CODE`, `COACH_CODE`, `AUTH_SECRET` (xem `env.example`). Sau đó Redeploy.
5. **Đẩy kho đề lên Blob** từ máy này: chép dòng `BLOB_READ_WRITE_TOKEN=...` (Storage → kho Blob → tab `.env.local`) vào file `.env.local`, rồi chạy
   `node scripts/upload-content.mjs` (thử trước bằng `--dry` để xem số file và dung lượng).
   Xong thì xoá dòng token khỏi `.env.local` nếu muốn máy này tiếp tục đọc `content/` tại chỗ.
6. Mở địa chỉ Vercel, nhập mã người học trên laptop của người học; nhập mã người kèm trên máy mình để vào `/coach`.

## Khi thêm hoặc sửa đề

Sửa ở `D:/ielts-data/work`, lắp lại bằng `tools/assemble.py`, nén audio mới (bước 1 chỉ nén file chưa có), rồi chạy lại `node scripts/upload-content.mjs`. Script chỉ tải file mới hoặc đã đổi kích thước. Máy chủ giữ đề trong bộ nhớ tối đa 10 phút nên thay đổi có thể hiện chậm chừng đó.

## Giới hạn của gói miễn phí cần nhớ

- Blob: 1 GB lưu trữ, 10 GB tải xuống và 2.000 lượt ghi mỗi tháng. Vượt giới hạn thì kho bị khoá 30 ngày.
- Vì vậy app gom việc lưu tiến độ: tối đa 3 phút một lần, riêng nộp bài / học xong bài / lưu hồ sơ thì lưu sau 2 giây. Một ngày học bình thường tốn khoảng 10–25 lượt ghi.
- Mỗi lần mở trang Vercel → Storage để xem file cũng tính lượt.

## Sao lưu

Lần lưu đầu tiên của mỗi ngày, bản tiến độ hôm trước được cất vào `data/backup/progress-YYYY-MM-DD.json`. Muốn khôi phục: tải file đó về, mở app bằng mã người học → Nhật ký → Cài đặt → Nhập dữ liệu.
