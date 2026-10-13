# DSC Academy Video — video người que tự động

> **Chạy tự động trên GitHub:** mỗi lần đẩy kịch bản mới vào `content/` trên nhánh `main`, workflow `Render videos` tự tạo giọng (Gemini, dùng secret `GEMINI_API_KEY`), dựng và render bằng HyperFrames. Video nằm ở `out/` trên nhánh **`renders`**, báo cáo từng video ở `status/`.

Demo luồng tự động hoá video giáo dục dạng người que cho DSC, chi phí 0 đồng:

1. **Kịch bản**: Claude (gói Pro) viết file `content/<chủ-đề>.json`.
2. **Giọng đọc**: Gemini TTS (free tier) đọc cả kịch bản trong 1 lần gọi API, script tự cắt thành từng cảnh.
3. **Dựng hình**: script sinh composition HyperFrames: nhân vật người que SVG, chuyển động GSAP, phụ đề, màu thương hiệu DSC.
4. **Render**: HyperFrames xuất 2 bản MP4: 16:9 cho YouTube, 9:16 cho Shorts/Reels/TikTok.



## Cài đặt (một lần)

Cần cài sẵn:

- **Node.js 22 trở lên**: https://nodejs.org
- **FFmpeg**:
  - macOS: `brew install ffmpeg`
  - Windows: `winget install ffmpeg`
- **Google Chrome**: HyperFrames dùng Chrome để render.

Sau đó mở terminal trong thư mục này và chạy:

```bash
npm install
npx hyperframes doctor       # kiểm tra Chrome + FFmpeg đã sẵn sàng
```

Lấy API key Gemini miễn phí tại https://aistudio.google.com/apikey. Sau đó copy `.env.example` thành `.env` và dán key vào dòng `GEMINI_API_KEY=`.

## Chạy demo

```bash
npm run make -- content/pe-la-gi.json
```

Lệnh này chạy lần lượt 3 bước: giọng đọc → dựng → render. Video ra trong thư mục `out/`.

Bạn cũng có thể chạy từng bước:

```bash
npm run tts -- content/pe-la-gi.json      # tạo build/pe-la-gi/voice.wav + timings.json
npm run build -- content/pe-la-gi.json    # tạo composition 16:9 và 9:16
npm run preview                           # mở HyperFrames Studio để xem/sửa trên timeline
npm run render -- content/pe-la-gi.json   # xuất MP4 (thêm "draft" ở cuối để render nhanh)
```

Chưa có API key? Chạy `npm run make -- content/pe-la-gi.json --no-voice` để xem phần hình trước. Bản này không có tiếng và dùng thời lượng ước lượng.

## Làm video mới

Mở Claude Code trong thư mục này và gõ, ví dụ:

> Làm video "Cổ tức là gì" theo quy trình trong CLAUDE.md

Claude sẽ viết `content/co-tuc-la-gi.json` theo đúng cấu trúc, dừng lại để bạn duyệt nội dung, rồi chạy `npm run make`.

## Tuỳ chỉnh

| Muốn đổi | Sửa ở đâu |
| --- | --- |
| Màu thương hiệu | `scripts/lib/brand.mjs` |
| Tư thế nhân vật | `scripts/lib/figure.mjs` (bảng `POSES`) |
| Bố cục, cỡ chữ, kiểu cảnh | `scripts/build.mjs` |
| Giọng đọc | `voice.voiceName` trong file kịch bản, hoặc `GEMINI_VOICE` trong `.env` |

## Lưu ý

- Gemini TTS free tier có giới hạn số lượt gọi mỗi phút/ngày; xem hạn mức ở Google AI Studio. Nếu gặp lỗi 429, script tự chờ và thử lại.
- Dữ liệu gửi qua free tier có thể được Google dùng để cải thiện sản phẩm. Chỉ dùng cho kịch bản công khai, không dùng cho nội dung nội bộ.
- Luôn nghe lại `voice.wav` trước khi render, đặc biệt cách đọc số và thuật ngữ (P/E, EPS…). Nếu đọc sai, viết lại câu đó trong kịch bản theo cách đọc (ví dụ "năm mươi nghìn" thay vì "50.000") rồi chạy lại `npm run tts`.
- Mọi video phải được người có chuyên môn duyệt nội dung trước khi đăng.
- Font Inter: giấy phép SIL OFL. GSAP: giấy phép chuẩn của GreenSock, miễn phí. HyperFrames: Apache 2.0.
