# DSC Academy Video

Video giáo dục đầu tư tự động: Claude Code viết kịch bản → Gemini đọc → HyperFrames dựng và render.
Ba loại video: chuỗi người que (**series**), video essay cắt dán giấy (**essay**), phim kể chuyện (**story**).

## Cài đặt (một lần)

- Node.js 22+, FFmpeg (`brew install ffmpeg`), Google Chrome.
- `npm install` rồi `npx hyperframes doctor`.
- Copy `.env.example` thành `.env`, điền `GEMINI_API_KEY` (miễn phí ở https://aistudio.google.com/apikey); `GCP_SA_KEY` nếu dùng giọng Google Cloud hoặc nhạc Lyria.

## Làm một video

```bash
npm run new -- t13-ten-bai "Tiêu đề"        # tạo videos/t13-ten-bai/script.json (essay-…/story-… hoặc --format)
# viết nội dung (hoặc nhờ Claude: "Làm tập 13 … theo CLAUDE.md")
npm run lint -- t13                           # kiểm tra kịch bản, không tốn API
npm run video -- t13 --draft                  # bản xem nhanh: videos/<id>/draft.mp4
npm run video -- t13                          # bản cuối: "T13 - Tiêu đề.mp4" + .srt + .jpg
```

`npm run video` tự dùng lại giọng/nhạc nếu lời không đổi, tự lấy bản GitHub đã tạo (nhánh `renders`) nếu máy chưa có. Khi cần gọi API (giọng hoặc nhạc mới), lệnh dừng và báo số ký tự, chi phí; thêm `--api` để chạy. `--no-voice` dựng không tiếng để xem hình. Log đầy đủ ở `videos/<id>/.work/log.txt`.

## Sửa tay trong HyperFrames

```bash
npm run edit -- open t01 --app     # mở ứng dụng HyperFrames (bỏ --app: Studio trên trình duyệt)
npm run edit -- save t01           # khoá bản sửa vào videos/<id>/edit/ (lưu trong git)
npm run edit -- status t01         # | drop t01: bỏ bản sửa
```

## Thư mục

```
videos/<id>/
  script.json            kịch bản (git)
  edit/                  bản sửa tay đã khoá (git)
  SHOTLIST.md, media/    phim kể chuyện: bảng phân cảnh (git), ảnh/clip (chỉ trên máy)
  voice.wav timings.json music.wav …   giọng, nhạc, tiếng động
  project/               dự án HyperFrames sinh ra — mở/sửa được
  "T01 - Vĩ mô là gì.mp4" .srt .jpg   đầu ra; draft.mp4 bản nháp
  .work/                 log, file trung gian
scripts/                 luồng chính (video, new, lint, edit, pull, build*, tts*, music, story-*)
scripts/lib/             thư viện dùng chung (cảnh, nhân vật, giọng, âm thanh, đường dẫn)
lab/                     thử nghiệm: 3D (Three.js), puppet, fx, sound/voice test — npm run lab:*
assets/                  font, GSAP, mô hình whisper (assets/models/, tải về máy)
docs/essay-guide.md      hướng dẫn viết video essay
```

## Chạy trên GitHub (máy công ty)

Đẩy `videos/<id>/script.json` (hoặc `edit/`) lên `main` → workflow **Render videos** tạo giọng, dựng, render; kết quả ở nhánh `renders` (`out/<id>.mp4`, `.srt`, `status/<id>.json`, `cache/<id>/`). Phim kể chuyện không chạy trên GitHub (media chỉ có trên máy). Về máy cá nhân: `npm run pull` (hoặc `npm run pull -- t01`) chép giọng, nhạc, video vào `videos/<id>/`.

## Lưu ý

- Gemini TTS free tier có giới hạn lượt gọi; lỗi 429 thì script tự chờ và thử lại. Dữ liệu free tier có thể được Google dùng để cải thiện sản phẩm: chỉ dùng cho kịch bản công khai.
- Nghe lại giọng trước khi đăng, nhất là số và thuật ngữ; đọc sai thì viết lại câu theo cách đọc rồi chạy `npm run video -- <id> --api`.
- Mọi video phải được người có chuyên môn duyệt nội dung trước khi đăng.
- Font Inter: SIL OFL. GSAP: giấy phép chuẩn GreenSock. HyperFrames: Apache 2.0.
