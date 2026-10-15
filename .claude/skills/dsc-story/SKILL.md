---
name: dsc-story
description: Làm phim kể chuyện DSC Academy (story-*) với nhân vật, bối cảnh và ảnh/clip AI trong media/ — tạo shot list, báo phí ảnh, nhập file, dựng trên máy. Dùng khi người dùng muốn phim ngắn kể chuyện có nhân vật, id story-*.
---

# Phim kể chuyện (`story-…`)

- `script.json` có `characters`, `places`; mỗi cảnh có `shot`. Mẫu: `videos/story-chiec-lo-cua-ba/`, `videos/story-gia-cua-tien/`.
- Ảnh/clip ở `videos/<id>/media/` (không lưu trong git). `npm run story:images -- videos/<id>/script.json` báo phí trước, `--yes` mới gọi API (khi người dùng đồng ý). `npm run story:import` nhận file tải về.
- `npm run video -- <id>` tự cập nhật `SHOTLIST.md`; phim kể chuyện chỉ render trên máy (GitHub bỏ qua).
- Kiểm tra khung AI bị viền/dải trống: `scripts/lib/frame-check.mjs` (tự chạy trong contact sheet của **dsc-qa**).
- Quy tắc nội dung như mọi video DSC (skill **dsc-video**); không vẽ khuôn mặt người thật có danh tính.
