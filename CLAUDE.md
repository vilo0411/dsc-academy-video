# Quy trình làm video DSC Academy

Dự án sinh video giáo dục đầu tư cho Công ty Chứng khoán DSC. Chuỗi hiện tại: **Kinh tế vĩ mô cho nhà đầu tư** (12 tập, mỗi tập 3–4 phút, gắn ở đầu bài viết cùng số trên DSC Academy). Sổ tay sản xuất (giọng đọc, dàn doanh nghiệp giả định, số liệu cố định, đề cương 12 tập) là nguồn chuẩn; dữ liệu dùng chung ở `scripts/lib/series.mjs`.

Mỗi video một thư mục `videos/<id>/` (kịch bản `script.json`, giọng, `project/` HyperFrames, mp4/srt/jpg). Làm video mới **không cần đọc `scripts/`**: skill dự án + `npm run lint` là đủ.

## Skill dự án (`.claude/skills/`) — nạp trước khi làm

| Việc | Skill |
| --- | --- |
| Làm/sửa/dựng/bàn giao bất kỳ video nào (điểm vào, quy tắc chung) | `dsc-video` |
| Tập vĩ mô `tNN-…` (người que, cảnh dựng sẵn) và hoạt hình `toon-…` | `dsc-toon` |
| Video essay `essay-…` (workflow 7 bước từ research tới bàn giao) | `dsc-essay` |
| Video ngắn 9:16 `shorts-…` | `dsc-shorts` |
| Phim kể chuyện `story-…` | `dsc-story` |
| Nhạc, tiếng động, độ to, mix v2 | `dsc-audio` |
| Kiểm tra sau khi dựng/render | `dsc-qa` |
| Viết mã GSAP (quy tắc chính chủ, HyperFrames ưu tiên) | `vendor-gsap-core`, `-timeline`, `-plugins`, `-performance` |

## Luồng làm việc

1. `npm run new -- <id> "Tiêu đề"` → `videos/<id>/script.json`, giữ nguyên khối `voice`. `tNN-…` tạo tập vĩ mô trên bộ toon (cảnh dựng sẵn); `--format series` cho bộ dựng người que cũ.
2. Điền nội dung → `npm run lint -- <id>` tới khi không còn ✗ (⚠ là gợi ý).
3. `npm run video -- <id> --draft` để xem nhanh, `--audio-only` để nghe lời + nhạc, `--batch a,b,c` cho nhiều video; `npm run video -- <id>` cho bản cuối. Màn hình chỉ in tóm tắt (kèm `⚠ Nhịp hình`, `⚠ Timeline`, âm lượng LUFS, contact sheet); khi lỗi mới đọc `videos/<id>/.work/log.txt` bằng `tail`/`grep`.
4. Mã thoát 2 = cần gọi API (giọng mới, nhạc Lyria, ảnh AI): báo người dùng số ký tự và loại phí, chỉ chạy lại với `--api` khi họ đồng ý.
5. Không tự đăng video; giao đường dẫn mp4/srt/jpg và `<Tên> (mô tả).txt` (chương YouTube, miễn trừ, ghi công).
6. Người dùng đã đồng ý **không cần duyệt kịch bản trước**. `"approved": false` để xem thử hình mà không tạo giọng.

## Quy tắc nội dung (bắt buộc)

- Không nêu tên hay mã cổ phiếu thật, không khuyến nghị mua/bán, không dự báo giá, không cam kết lợi nhuận.
- Chỉ dùng doanh nghiệp giả định trong `scripts/lib/series.mjs` với đúng số liệu cố định của sổ tay; luôn có nhãn "giả định".
- Kiến thức phải khớp bài viết cùng số. Nếu không chắc, hỏi người dùng thay vì đoán.
- Viết số theo cách đọc trong `text` ("năm mươi nghìn đồng"); chữ số chỉ đặt trong `visual`. Viết đủ "Ngân hàng Nhà nước", "đô la Mỹ".
- CTA mời đọc bài viết bên dưới video; cảnh cuối luôn có `disclaimer`.
- Không thêm bóng thoại/lời thoại hư cấu cho nhân vật.

## 12 tập đã giao

`t01`–`t12` dùng bộ dựng người que cũ (`scripts/build.mjs`, giữ nguyên để dựng lại ra y hệt). Không đổi hình/âm thanh hay chuyển sang toon khi người dùng chưa yêu cầu.

## GitHub và kết quả

- Máy công ty: đẩy `videos/<id>/script.json` (hoặc `edit/`) lên `main` → GitHub tạo giọng, dựng (có Whisper cho mốc từng từ), render; kết quả trên nhánh `renders` (`out/<id>.mp4`, `.srt`, `status/<id>.json`). Phim kể chuyện và toon có `cast` (ảnh AI trong `media/`) chỉ dựng trên máy.
- Máy cá nhân: `npm run pull [-- <id>]` chép giọng/nhạc/video từ `renders`; `npm run video` cũng tự làm khi thiếu giọng.

## Sửa tay trong HyperFrames Studio

`videos/<id>/project/` là dự án HyperFrames.
- `npm run edit -- open <id> [--app]` mở Studio (trình duyệt hoặc ứng dụng desktop). Sửa xong: `npm run edit -- save <id>` khoá vào `videos/<id>/edit/` (lưu trong git).
- Khi đã khoá, mọi bước dựng dùng `index.html` đã sửa; sửa kịch bản sẽ không đổi video và log có `⚠ Bản sửa`. Bản sinh mới ở `videos/<id>/.work/generated-16x9.html`.
- `npm run edit -- status|drop <id>`. Trước khi sửa kịch bản của video đã có `edit/`, hỏi người dùng nên bỏ bản sửa hay sửa trực tiếp trong `edit/`.

## Thử nghiệm

`lab/`: hoạt hình rối, fx, 3D Three.js (`npm run lab:build3d|lab:render3d|lab:preview3d|lab:inspect3d`, storyboard ở `lab/content3d/`), sound/voice test. Không thuộc luồng chính; kết quả ở `lab/build/`, `lab/out/`.

Tài liệu: `docs/video-production-handbook.md` (sổ tay thể loại, kỹ thuật dựng, âm thanh, công cụ), `docs/toon-guide.md`, `docs/essay-guide.md`, `docs/audio-guide.md`, `docs/studio-aizening-optimization.md`.
