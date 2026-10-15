---
name: dsc-shorts
description: Viết và dựng video ngắn 9:16 DSC Academy (TikTok, YouTube Shorts, Reels) định dạng shorts-kinetic hoặc shorts-micro — câu móc 2 tầng, phụ đề chữ chạy, cue, ảnh bìa. Dùng khi người dùng muốn video ngắn, dọc, id shorts-*, hoặc cắt một tập dài thành shorts.
---

# Video ngắn 9:16

Bộ dựng `scripts/build-shorts.mjs` (cue, preset, vùng an toàn: `scripts/lib/shorts-style.mjs`). Mẫu: `templates/shorts-kinetic/`, `templates/shorts-micro/`. Học từ AI Zening Studio: `docs/studio-aizening-optimization.md`.

## Khung
- Thắng/thua trong 3 giây đầu. Kinetic 25–60 giây (100–260 âm tiết), micro 15–30 giây. Cảnh đầu `hook_2tier` (≤ 14 âm tiết); mỗi cảnh ≤ 6 giây; cảnh cuối `outro_cta` có `disclaimer`, CTA mời đọc bài ở phần mô tả.
- Kết vòng lặp khi hợp: câu cuối gợi lại câu đầu để người xem xem lại.
- Cắt từ tập dài: lấy câu móc + một chuỗi tác động/ví dụ có số liệu của tập, viết lại ≤ 60 giây, giữ nguyên khối `voice`.
- Không làm split-screen kiểu parkour/ASMR, không dùng nhạc trend/TikTok CML, không emoji (dùng `icon`).

## Thông số
1080×1920, 30 fps; vùng an toàn chừa đáy khoảng 320 px, phải khoảng 120 px (giao diện TikTok/Shorts); phụ đề đốt vào hình; khung đầu dùng làm ảnh bìa. Tài khoản công ty: bật nhãn nội dung thương hiệu khi đăng (người dùng tự đăng).

## Phụ đề và kiểu chữ
- Phụ đề tự sinh từ lời (`style.capWords`); mốc từng từ từ Whisper (máy và GitHub), thiếu thì chia đều. `visual.keywords[]` giữ màu nhấn.
- `style.captions`: `clean` (mặc định) hoặc `bold` (IN HOA cụm 3 từ kiểu Hormozi).
- `preset`: dsc (mặc định), taichinh, kienthuc, giaoduc, tintuc. Đè màu: `style.highlight_color` / `secondary_color` / `keyword_color`.
- `thumbnails[3]` {type: question | number | compare, kicker, title ≤ 22 ký tự, sub?, dir?, left/right…}: bản cuối sinh `<Tên> (bìa A|B|C).jpg` để A/B test bằng "Test & Compare" của YouTube.

| cue | Trường |
| --- | --- |
| `hook_2tier` | tier1, tier2, at?, mark?, icon?, punch_zoom? |
| `big_counter` | value, label?, from?, icon?, tone? |
| `ab_compare` | left/right {kicker, title, value?, text?, tone}, headline?, rightAt?, vs? |
| `list` | items[] (chuỗi hoặc {title, text, at, icon}), headline? |
| `steps` | items[], active?, numbered? |
| `chapter` | title (≤ 22 ký tự), num?, sub? |
| `statement` | text, style: slide/type/glow/blur/hand, mark?, markStyle: wave/highlight, y? |
| `arrow` | dir: up/down, value?, label? |
| `question` | text, options[≤3] (không bịa bình luận) |
| `outro_cta` | headline, sub?, cta?, disclaimer |

Dùng chung: `at`, `sfx` (sub_boom, whoosh, pop, ding, tick, click, typewriter, riser, glitch, marker, tape, snap, chime…), `badge` (ví dụ "Giả định"), `circle` + `circleLabel`, `keywords[]`, `icon` (up, down, warn, check, coin, clock, bulb, question).
Chưa có bộ dựng: `faceless`, `shorts-skit`, `shorts-split` (lint báo ✗).
