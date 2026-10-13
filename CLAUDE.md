# Quy trình làm video người que DSC Academy

Dự án này sinh video giáo dục đầu tư dạng người que cho Công ty Chứng khoán DSC. Khi người dùng yêu cầu làm video về một chủ đề, làm theo đúng các bước dưới đây.

## 1. Viết kịch bản

Tạo `content/<slug>.json`, dùng các file trong `content/` làm mẫu.

- Dài 60–90 giây, khoảng 9–12 cảnh. Mỗi cảnh 1–2 câu, tối đa khoảng 30 từ.
- Cảnh đầu là câu hỏi hoặc tình huống gây tò mò (hook). Cảnh cuối là `outro`, luôn kèm `disclaimer`.
- Viết số theo cách đọc trong `text`, ví dụ "năm mươi nghìn đồng". Số dạng chữ số chỉ đặt trong `visual`.
- Giọng văn thân thiện, dễ hiểu cho người mới. Thuật ngữ tiếng Anh phải giải thích ngay.

## 2. Quy tắc nội dung (bắt buộc)

- Không nêu tên hay mã cổ phiếu thật, không khuyến nghị mua/bán, không dự báo giá, không cam kết lợi nhuận.
- Ví dụ dùng công ty giả định ("Công ty A") và ghi rõ "ví dụ minh hoạ" hoặc "số liệu giả định".
- Kiến thức phải chính xác. Nếu không chắc, hỏi người dùng thay vì đoán.
- Sau khi viết xong, **dừng lại và đưa kịch bản cho người dùng duyệt** trước khi tạo giọng đọc.

## 3. Các kiểu cảnh (`visual.type`)

| type | Trường | Dùng khi |
| --- | --- | --- |
| `title` | headline, sub | Mở đầu |
| `formula` | left, top, bottom | Công thức dạng phân số |
| `numbers` | label, items[{k,v}] | Liệt kê 2–3 con số |
| `calc` | expr, result | Phép tính và kết quả |
| `coins` | pay, get, caption | So sánh tiền bỏ ra/nhận về |
| `trend` | direction (up/down), headline, sub | Xu hướng tăng/giảm |
| `split` | headline, a, b | Hai khả năng đối lập |
| `compare` | headline, bars[{k,v}], note | So sánh 2–4 giá trị (bar ngang) |
| `warning` | headline, sub | Cảnh báo, lưu ý |
| `checklist` | headline, items[] (tối đa 4) | Tóm tắt các điểm |
| `outro` | headline, sub, disclaimer | Kết thúc |

`visual.pose` (tư thế nhân vật): `idle`, `point`, `wave`, `cheer`, `think`, `shrug`.

Giữ chữ trong `visual` ngắn: headline ≤ 28 ký tự, mỗi mục ≤ 30 ký tự. Muốn thêm kiểu cảnh mới thì viết thêm một `case` trong `renderScene` ở `scripts/build.mjs`.

## 4. Chạy

```bash
npm run tts -- content/<slug>.json      # cần GEMINI_API_KEY trong .env
npm run build -- content/<slug>.json
npx hyperframes check                   # chạy trong build/<slug>/video-16x9 và video-9x16
npm run render -- content/<slug>.json draft
```

Xem vài frame bằng `npx hyperframes snapshot` để kiểm tra chữ không tràn, rồi mới render bản `looks`. Không tự đăng video; giao file trong `out/` cho người dùng.
