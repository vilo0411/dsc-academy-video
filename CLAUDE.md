# Quy trình làm video người que DSC Academy

Dự án sinh video giáo dục đầu tư dạng người que cho Công ty Chứng khoán DSC. Chuỗi hiện tại: **Kinh tế vĩ mô cho nhà đầu tư** (12 tập, mỗi tập 3–4 phút, gắn ở đầu bài viết cùng số trên DSC Academy). Sổ tay sản xuất (giọng đọc, dàn doanh nghiệp giả định, số liệu cố định, đề cương 12 tập) là nguồn chuẩn; dữ liệu dùng chung nằm ở `scripts/lib/series.mjs`.

## 1. Viết kịch bản

Tạo `content/tNN-<slug>.json`, dùng `content/t01-vi-mo-la-gi.json` làm mẫu (giữ nguyên khối `voice`).

- 3–4 phút: khoảng 600–750 âm tiết, 20–30 cảnh. Theo khung 8 phần: mở đầu, tập trước, khái niệm, đọc số liệu, chuỗi tác động, ví dụ, tóm tắt và quiz, gieo tập sau và CTA.
- Viết số theo cách đọc trong `text` ("năm mươi nghìn đồng"); chữ số chỉ đặt trong `visual`. Viết đủ "Ngân hàng Nhà nước", "đô la Mỹ".
- CTA luôn là mời đọc bài viết bên dưới video. Cảnh cuối là `outro`, luôn có `disclaimer`.
- Người dùng đã đồng ý **không cần duyệt kịch bản trước**: đẩy lên `main` là GitHub tự tạo giọng và render. Chỉ đặt `"approved": false` khi muốn xem thử hình mà không tốn lượt gọi API giọng đọc.

## 2. Quy tắc nội dung (bắt buộc)

- Không nêu tên hay mã cổ phiếu thật, không khuyến nghị mua/bán, không dự báo giá, không cam kết lợi nhuận.
- Chỉ dùng doanh nghiệp giả định trong `scripts/lib/series.mjs` với đúng số liệu cố định của sổ tay; luôn có nhãn "giả định".
- Kiến thức phải khớp bài viết cùng số. Nếu không chắc, hỏi người dùng thay vì đoán.

## 3. Kiểu cảnh (`visual.type`)

Cơ bản: `title`, `formula`, `numbers`, `calc`, `coins`, `trend`, `split`, `compare`, `warning`, `checklist`, `outro` (xem `renderScene` trong `scripts/build.mjs`).

Chuỗi vĩ mô (`scripts/lib/scenes-macro.mjs`):

| type | Trường |
| --- | --- |
| `dashboard` | headline?, show[], reveal[], blink, lit[] — khoá nhóm: growth, prices, money, external, fiscal |
| `chain` | headline?, highlight: profit/valuation/both/none, dir: up/down, caption? |
| `pair` | headline?, items[{company, rows[{k,v}], move: up/down/downBig/flat, moveLabel}] |
| `versus` | headline?, left{title,text}, right{title,text} |
| `tide` | headline, sub |
| `quiz` | question, options[3], footer? |
| `notebook` | entries[] (dòng cuối là dòng mới của tập) |

Nhân vật An (`scripts/lib/figure.mjs`):

- `visual.pose`: idle, point, pointUp, present, wave, cheer, think, shrug, hips, headHold, facepalm.
- `visual.expr` (tuỳ chọn, mặc định theo tư thế; với cảnh `calc` dùng `visual.face` vì `expr` là phép tính): happy, excited, surprised, worried, sad, thinking, confused, confident, neutral.
- `visual.emote` (tuỳ chọn): question, exclaim, bulb, sweat, sparkle.
- Đổi tư thế/biểu cảm theo cảm xúc của câu thoại; tránh lặp một tư thế quá 3 cảnh liền.

## 4. Chạy

Trên GitHub (mặc định): đẩy file kịch bản lên `main`. Video ở `out/<id>.mp4`, báo cáo ở `status/<id>.json` trên nhánh `renders`.

Trên máy: `npm run tts -- content/<file>.json` (cần `GEMINI_API_KEY`), `npm run build -- content/<file>.json`, rồi `npx hyperframes check` và `npm run render -- content/<file>.json` trong thư mục dự án. Không tự đăng video; giao file cho người dùng.
