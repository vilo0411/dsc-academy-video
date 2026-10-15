---
name: dsc-essay
description: Workflow đầy đủ làm video essay DSC Academy phong cách cắt dán giấy (Vox) — từ research có nguồn, chọn arc và câu móc, viết lời, bản nghe duyệt nhịp, dựng hình (camera, cuts, mảnh ghép), QA tới bàn giao. Dùng khi người dùng muốn làm video essay/phóng sự phân tích, id essay-*, hoặc sửa một essay đã có.
---

# Video essay (cắt dán giấy)

Bộ dựng `scripts/build-essay.mjs`, `"format": "essay"`, không có nhân vật An. Mẫu: `videos/essay-lich-su-lam-phat/` (ngắn), `videos/essay-lam-phat-ho-so/` (dài, 66 cảnh).
Tài liệu: `docs/essay-guide.md` (arc, câu móc, máy quay, cuts, âm thanh) và thư viện nhịp gốc `docs/vendor/vox-director-beat-layer.md` (Alisa0808/vox-director, MIT).

## Bước 1 — Research (bắt buộc trước khi viết)
- Lập bảng dữ kiện: mỗi dòng một sự kiện/con số + nguồn (tên, năm, URL). Ưu tiên nguồn gốc: Ngân hàng Nhà nước, Tổng cục Thống kê, IMF, World Bank, sách sử có tác giả.
- Ghi vào `sources` trong `script.json`. Dữ kiện không tìm được nguồn thì bỏ, hoặc hỏi người dùng.
- Kiến thức phải khớp bài viết cùng số trên DSC Academy nếu có `article`.

## Bước 2 — Arc, câu móc, dàn nhịp
- Chọn `arc` theo chủ đề: timeline (lịch sử), hook_payoff (một ý), myth_buster (hiểu lầm), how_it_works (cơ chế), man_in_hole (khủng hoảng → phục hồi), three_act.
- Câu móc trong 3 giây đầu: ngày tháng + địa điểm + một chi tiết lạ, con số sốc, câu hỏi, hoặc "bạn đang hiểu sai…". Không mở bằng lời giới thiệu.
- Dàn nhịp theo tỷ lệ: móc 1–3 giây → thân 70–80% → vỡ lẽ 10–20% → kết/CTA ≤ 5 giây. Re-hook mỗi 45–90 giây với video dài. Nối ý bằng "nhưng / vì thế", không dùng "và rồi".
- Chốt tiêu đề và ý ảnh bìa trước khi viết (đóng gói trước, sản xuất sau).
- Đưa dàn nhịp (mỗi cảnh: ý hình + câu chính) cho người dùng xem khi video dài hơn 2 phút.

## Bước 3 — Viết lời → lint
- `npm run new -- essay-<slug> "Tiêu đề"`. Mỗi cảnh một ý hình ảnh; độ dài theo bảng âm tiết trong `essay-guide.md` (Kore ≈ 3 âm tiết/giây).
- Số viết theo cách đọc; dùng `section` để tạo chương YouTube.
- `npm run lint -- <id>` tới khi không còn ✗.

## Bước 4 — Bản nghe (duyệt lời + nhạc, chưa dựng hình)
- `npm run video -- <id> --audio-only` → `<Tên> (nghe thử).mp3`. Lần đầu dừng mã 2: báo số ký tự giọng và phí Lyria (`music.prompt`), chỉ thêm `--api` khi người dùng đồng ý; hoặc chọn nhạc thư viện (skill **dsc-audio**).
- Người dùng duyệt nhịp đọc, chỗ ngắt, độ to nhạc trước khi tốn công dựng hình.

## Bước 5 — Dựng hình
- `visual.bg`: news, kraft, dark, grid. `visual.pieces[]`: `scrap`, `art` (banknote, bundle, stove, flame, logs, bread, coin, helmet, scale, ticket, basket, bowl, calendar), `label`, `type`, `stamp`, `tape`, `counter`, `chart`; vào khung theo thứ tự hoặc theo `at` 0–1 trong phần lời. Hình mới thêm vào `scripts/lib/essay-art.mjs`.
- `visual.camera`: push_in, pull_out, pan_left, pan_right, tilt_up, tilt_down, parallax, static — không hai cảnh liền nhau cùng kiểu; static cho câu chốt.
- `visual.cuts[]` {at, x, y, zoom} cắt vào chi tiết cho cảnh > 6 giây. `fly` (vật bay ngang) chỉ ở nhịp then chốt. `strings[]` (dây đỏ), `marks[]` (khoanh bút đỏ).
- `hit: true` trên mảnh quan trọng nhất, tối đa 3–4 lần/video.
- Không vẽ khuôn mặt người thật; trẻ em chỉ thể hiện bằng đồ vật.
- `npm run video -- <id> --draft`, xem `⚠ Nhịp` (`.work/pacing.json`: cảnh đứng yên > 5 giây, trùng máy quay, mở đầu chậm).

## Bước 6 — QA
Theo skill **dsc-qa**: contact sheet, `⚠ Nhịp`/`⚠ Timeline`, LUFS, quy tắc nội dung trên hình và ảnh bìa, nguồn đủ cho mọi con số.

## Bước 7 — Bàn giao
`npm run video -- <id>` → mp4, srt, jpg, `<Tên> (mô tả).txt` (chương từ `section`, miễn trừ, `credits.txt`). Không tự đăng.
