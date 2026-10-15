---
name: dsc-video
description: Điểm vào để làm bất kỳ video DSC Academy nào (tập vĩ mô người que, toon, essay, shorts 9:16, phim kể chuyện). Dùng khi người dùng muốn làm, sửa, dựng, render hoặc bàn giao một video trong dự án này; chọn định dạng rồi nạp skill con dsc-toon / dsc-essay / dsc-shorts / dsc-story, âm thanh ở dsc-audio, kiểm tra ở dsc-qa.
---

# Làm video DSC Academy

## 1. Chọn định dạng → nạp skill con

| Người dùng muốn | id | Skill |
|---|---|---|
| Tập chuỗi "Kinh tế vĩ mô cho nhà đầu tư" (3–4 phút, người que An) | `tNN-<slug>` | **dsc-toon** (cảnh dựng sẵn, không cần vẽ) |
| Hoạt hình kể chuyện kiểu OverSimplified | `toon-<slug>` | **dsc-toon** (cảnh vẽ tay trong scenes.mjs) |
| Video essay cắt dán giấy (Vox) | `essay-<slug>` | **dsc-essay** |
| Video ngắn 9:16 (TikTok/Shorts/Reels) | `shorts-<slug>` | **dsc-shorts** |
| Phim kể chuyện có ảnh/clip AI | `story-<slug>` | **dsc-story** |

Nhạc, ambience, tiếng động, độ to: **dsc-audio**. Sau mỗi lần render: **dsc-qa**.
12 tập vĩ mô đã giao (`t01`–`t12`, `format` bản cũ "series") giữ nguyên bộ dựng `scripts/build.mjs`; không chuyển sang toon khi người dùng chưa yêu cầu.

## 2. Luồng chung

1. `npm run new -- <id> "Tiêu đề"` → `videos/<id>/script.json` (giữ nguyên khối `voice`).
2. Viết nội dung theo skill con → `npm run lint -- <id>` tới khi không còn ✗ (⚠ là gợi ý).
3. Xem nhanh: `npm run video -- <id> --draft` (hoặc `--build-only` rồi snapshot). Bản cuối: `npm run video -- <id>`.
   Bản nghe để duyệt lời/nhạc trước khi dựng hình: `--audio-only`. Nhiều video: `--batch a,b,c` (tóm tắt `videos/.batch.json`).
4. Màn hình chỉ in tóm tắt; lỗi thì đọc `videos/<id>/.work/log.txt` bằng `tail`/`grep`.
5. Mã thoát 2 = cần gọi API (giọng mới, nhạc Lyria, ảnh AI): báo số ký tự/ảnh và loại phí, chỉ chạy lại với `--api` (hoặc `--yes`) khi người dùng đồng ý.
6. Không tự đăng video. Bàn giao đường dẫn mp4, srt, jpg và `<Tên> (mô tả).txt` (chương YouTube + miễn trừ + ghi công).

## 3. Quy tắc nội dung (bắt buộc, mọi định dạng)

- Không nêu tên hay mã cổ phiếu thật, không khuyến nghị mua/bán, không dự báo giá, không cam kết lợi nhuận.
- Chỉ dùng doanh nghiệp giả định trong `scripts/lib/series.mjs`, đúng số liệu cố định, luôn có nhãn "giả định".
- Kiến thức khớp bài viết cùng số trên DSC Academy; không chắc thì hỏi người dùng, không đoán.
- Viết số theo cách đọc trong `text`; chữ số chỉ đặt trong `visual`. Cảnh cuối luôn có `disclaimer`; CTA mời đọc bài viết bên dưới video (shorts: phần mô tả).
- Không thêm bóng thoại/lời thoại hư cấu cho nhân vật; gag phản ứng không lời thì được.

## 4. GitHub và Studio

- Đẩy `videos/<id>/script.json` lên `main` → GitHub tạo giọng, dựng (có Whisper), render; kết quả trên nhánh `renders`. Phim kể chuyện và toon có `cast` (ảnh AI) chỉ dựng trên máy. `npm run pull [-- <id>]` chép giọng/nhạc/video về.
- Sửa tay: `npm run edit -- open <id> [--app]`, khoá bằng `npm run edit -- save <id>` (vào `videos/<id>/edit/`). Video đã có `edit/` thì hỏi người dùng trước khi sửa kịch bản (bỏ bản sửa hay sửa trong `edit/`).
- Quy tắc từ Remotion Skills: xem trước rồi mới render; chỉ render bản cuối khi người dùng muốn; không ghi đè chỉnh sửa người dùng làm ngoài phiên.
