---
name: dsc-qa
description: Kiểm tra chất lượng video DSC Academy sau khi dựng hoặc render — contact sheet, nhịp hình, lỗi timeline GSAP, mốc từ Whisper dễ lệch, độ to LUFS, quy tắc nội dung, gói bàn giao. Dùng sau mỗi lần npm run video, trước khi báo người dùng video đã xong.
---

# QA sau khi dựng/render

`npm run video` tự chạy và in vào tóm tắt; chi tiết ở `videos/<id>/.work/qa.json`.

1. **Hình** — đọc `videos/<id>/.work/contact.jpg` (một khung giữa mỗi cảnh) bằng Read; cần xem khoảnh khắc cụ thể thì `cd videos/<id>/project && npx hyperframes snapshot --describe false --no-end -o ../.work/snaps --at 3,8,15`. Soát: chữ tràn/che, hình trống, phụ đề che nội dung, khung có viền/dải trống (`⚠ Khung có viền`).
2. **Nhịp** — `⚠ Nhịp hình`: cảnh không có gì đổi quá 5 giây. Sửa bằng tách cảnh, `beats`/`punch` (toon), `cuts` (essay). Essay còn có `.work/pacing.json` (máy quay trùng, mở đầu chậm).
3. **Timeline** — `⚠ Timeline` từ `scripts/lib/tl-lint.mjs` (quy tắc GSAP Skills, bản sao ở `.claude/skills/vendor-gsap-*`): fromTo chồng thiếu `immediateRender: false` (hiện/nháy sai trước lúc), ease không có, animate top/left/width, `delay`/`repeat: -1` trong timeline, `#id` không có, tween sau khi video hết. Chạy riêng: `node scripts/lib/tl-lint.mjs videos/<id>/project/index.html`.
4. **Mốc từ** — `⚠ Mốc từ dễ lệch`: từ neo bị Whisper nghe nhầm hoặc độ tin cậy thấp; xem khung đó, lệch thì đổi sang từ bên cạnh. `.work/words.json` có `confidence` từng từ.
5. **Âm thanh** — dòng `Âm lượng`: lệch mục tiêu quá 1,5 LU hoặc đỉnh > -0,5 dBTP là có ⚠. Nghe thử: `--audio-only`.
6. **Nội dung** — chữ trên hình và ảnh bìa không có mã cổ phiếu thật, khuyến nghị, dự báo giá; doanh nghiệp giả định có nhãn; cảnh cuối có miễn trừ; số liệu có nguồn (essay/toon: `sources`).
7. **Bàn giao** — đường dẫn mp4, srt, jpg (và ảnh bìa A/B/C với shorts), `<Tên> (mô tả).txt`. Nói rõ cảnh báo còn lại và lý do giữ; không tự đăng.
