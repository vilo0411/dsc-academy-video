---
name: video-producer
description: >
  Chuyên gia AI tự động hóa sản xuất và dựng video cho YouTube (16:9) và TikTok / Shorts (9:16).
  Sử dụng khi người dùng yêu cầu: tạo video mới, viết kịch bản video, lên storyboard, chọn kỹ thuật dựng (J-Cut, L-Cut, Punch-in,
  Kinetic Captions, Parallax), lập trình cảnh HyperFrames / SVG Toon, hoặc tối ưu hóa nhịp độ (retention) cho video giáo dục và tài chính.
---

# Video Producer Skill: Quy Trình Dựng Video Tự Động Toàn Diện

Skill này cung cấp tiêu chuẩn sản xuất video từ A-Z, kết hợp giữa tư duy đạo diễn nội dung (Content Direction), các kỹ thuật dựng giữ chân người xem từ **AI Zening Studio**, và kỹ thuật lập trình sinh video (Code-as-Video).

---

## 1. Bản Đồ Lựa Chọn Format (`format`)

Khi người dùng đưa ra một chủ đề hoặc yêu cầu làm video, hãy xác định định dạng tối ưu nhất theo bảng sau:

| Mục tiêu & Nền tảng | Format ID | Tỷ lệ | Thời lượng | Đặc trưng thị giác | Lệnh khởi tạo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **YouTube Giáo Dục** | `series` | 16:9 | 3 – 4 phút | Người que An, dashboard số liệu, chain, quiz | `npm run new -- tNN-<slug> "Tiêu đề"` |
| **YouTube Phóng Sự** | `essay` | 16:9 | 5 – 10 phút | Báo chí gạch dạ quang, bản đồ tư liệu, timeline | `npm run new -- essay-<slug> "Tiêu đề"` |
| **YouTube Hoạt Họa** | `toon` | 16:9 | 3 – 5 phút | OverSimplified, punch-in gag cận mặt, xé giấy | `npm run new -- toon-<slug> "Tiêu đề"` |
| **YouTube Phim Tài Liệu** | `faceless` | 16:9 | 8 – 15 phút | 2.5D Parallax, tone đen sang trọng, tài liệu mật | `npm run new -- faceless-<slug> "Tiêu đề"` |
| **YouTube Biểu Đồ Số** | `dataviz` | 16:9 | 3 – 6 phút | Đồng hồ 4 pha, bar chart race, gauge đo PMI | `npm run new -- dataviz-<slug> "Tiêu đề"` |
| **TikTok Chữ Nhảy** | `shorts-kinetic` | 9:16 | 30 – 50s | Alex Hormozi style, chữ karaoke neon, emoji nảy | `npm run new -- shorts-<slug> "Tiêu đề"` |
| **TikTok Màn Hình Kép** | `shorts-split` | 9:16 | 45 – 60s | Nửa trên kể chuyện/podcast, nửa dưới game parkour | `npm run new -- shorts-split-<slug> "Tiêu đề"` |
| **TikTok Siêu Tốc 30s** | `shorts-micro` | 9:16 | 30s | 3 bước / 3 bí mật, thanh đếm ngược khẩn cấp | `npm run new -- shorts-micro-<slug> "Tiêu đề"` |
| **TikTok Tiểu Phẩm** | `shorts-skit` | 9:16 | 40 – 50s | Roleplay 2 vai (Nhà đầu tư F0 vs Chuyên viên) | `npm run new -- shorts-skit-<slug> "Tiêu đề"` |

---

## 2. Quy Trình Sản Xuất 5 Bước (The 5-Phase Pipeline)

```
[Phase 1: Hook & Concept] 
         │
         ▼
[Phase 2: Kịch bản & Visual Cues]
         │
         ▼
[Phase 3: Giọng đọc & Sync từng từ (TTS + Whisper)]
         │
         ▼
[Phase 4: Dựng & Kết xuất (Render Engine)]
         │
         ▼
[Phase 5: Kiểm duyệt & Đảm bảo chất lượng (Lint & QA)]
```

### Phase 1: Kỹ Thuật Viết Hook Giữ Chân (The 3-Second Rule)
Không bao giờ mở đầu bằng lời chào rườm rà ("Xin chào các bạn, hôm nay tôi sẽ nói về..."). Hãy bắt đầu bằng 1 trong 3 công thức:
1. **Nghịch lý giật mình:** *"Bạn có tin không: Một doanh nghiệp làm ăn có lãi 20% mỗi năm vẫn có thể phá sản chỉ trong 1 tuần?"*
2. **Nỗi sợ / Cảnh báo:** *"DỪNG LẠI! Nếu bạn chuẩn bị gửi tiết kiệm ngân hàng kỳ hạn 12 tháng..."*
3. **Mốc lịch sử / Con số gây sốc:** *"Đúng ngày này 50 năm trước, một quyết định kéo dài 15 phút tại Washington đã biến tờ giấy bạc trong ví bạn thành vĩnh viễn không thể đổi ra vàng!"*

### Phase 2: Kịch Bản & Cài Đặt Nhịp Điệu Thị Giác
* **Quy tắc 3s – 5s:** Không bao giờ để một cảnh đứng yên quá 4 giây. Phải luôn có ít nhất một yếu tố chuyển động:
  * Đổi tư thế người que (`pose`: `point`, `think`, `cheer`, `worried`).
  * Zoom máy quay (`camera`: `push_in`, `punch_in`, `drift_slow`).
  * Xuất hiện chi tiết mới (chữ highlighter dạ quang quét ngang, mũi tên đỏ vẽ rung, số liệu nhảy).
* **Quy tắc số học:**
  * Trong trường `text` (lời đọc): Phải viết bằng chữ để bộ đọc TTS phát âm chuẩn (*"năm mươi nghìn đồng"*, *"hai mươi phần trăm"*).
  * Trong trường `visual` (hình ảnh): Hiển thị bằng chữ số và ký hiệu trực quan (*"50.000 đ"*, *"+20%"*).

### Phase 3: Âm Thanh & Thiết Kế Hiệu Ứng (Sound Design)
* Luôn gắn SFX vào các thời điểm chuyển biến cảm xúc:
  * `whoosh`: Khi có chữ bay vào hoặc chuyển cảnh.
  * `pop` / `click`: Khi bullet point, badge xuất hiện.
  * `paper_tear`: Khi mở báo chí, tài liệu.
  * `cash_register`: Khi nhắc tới tiền, lợi nhuận, giá trị.
  * `sub_boom`: Khi có cảnh báo, tin xấu.
  * `riser`: Tạo căng thẳng trước khi tiết lộ kết quả hoặc đáp án.
* **Audio Ducking:** Hạ nhạc nền xuống tối thiểu `-18dB` đến `-22dB` khi có giọng nói để lời thoại trong trẻo, không bị chìm.

### Phase 4: Lập Trình Dựng Cảnh theo Engine của từng Format
Tùy thuộc vào `format` đã chọn ở Phase 1, AI sẽ gọi đúng engine và thư viện kết xuất tương ứng:
* **Format `toon`**: Sử dụng Engine Hoạt hình Rối SVG (`scripts/lib/puppet.mjs`, `toon-fx.mjs`, `toon-props.mjs`) với các hiệu ứng xé giấy, punch-in gag cận mặt, cử động rối tự do.
* **Format `series`**: Sử dụng Engine Nhân vật que An (`scripts/lib/figure.mjs`: `pose`, `expr`, `emote`) kết hợp các loại cảnh tài chính (`scripts/lib/scenes-macro.mjs`: `dashboard`, `versus`, `chain`, `pair`, `quiz`).
* **Format `essay`**: Sử dụng Engine Báo chí Tư liệu & Cắt dán (`scripts/lib/essay-art.mjs`, bản đồ `d3-geo`, `pieces`: `marker`, `stamp`, `headline`, camera phẳng). **Không dùng puppet**.
* **Format `faceless`**: Sử dụng Engine Điện ảnh 2.5D Parallax trên nền đen sang trọng (`camera`: `parallax_push`, chân dung vàng kim, tài liệu mật). **Không dùng puppet**.
* **Format `dataviz`**: Sử dụng Engine Biểu đồ & Chu kỳ (`scripts/lib/scenes-extra.mjs`: `cycle` đồng hồ 4 pha, `gauge` đo PMI, `grid`, `line`). **Không dùng puppet**.
* **Format `shorts-*` (9:16)**: Sử dụng Engine Phụ đề Động (Kinetic Typography, Karaoke highlight từng từ đồng bộ với Whisper, emoji nảy, bố cục màn hình kép hoặc đếm ngược).

### Phase 5: Linting & Xuất Bản
Sau khi viết kịch bản:
1. Chạy lệnh kiểm tra: `npm run lint -- <id>`
2. Sửa toàn bộ lỗi dấu ✗ (lỗi từ ngữ, cảnh thiếu thời gian, nhịp đọc quá nhanh > 4.5 âm tiết/giây).
3. Kết xuất bản xem trước (Draft): `npm run video -- <id> --draft`
4. Kiểm tra thành phẩm tại thư mục `videos/<id>/`.

---

## 3. Hệ Thống 20 Semantic Visual Cues Theo Ngữ Cảnh Lời Thoại

Lấy cảm hứng từ AI Zening Studio, AI Producer tự động kích hoạt các hiệu ứng hình ảnh & SFX tương ứng với ngữ nghĩa của lời thoại trong `visual`:

| Visual Cue Key | Ngữ Cảnh Kích Hoạt | Mô Tả Visual | SFX Khuyến Nghị |
| :--- | :--- | :--- | :--- |
| `hook_2tier` | Mở đầu video (3 giây đầu) | Chữ 2 tầng: Tầng trên trắng nhỏ, tầng dưới to rực rỡ | `whoosh` / `sub_boom` |
| `karaoke_flow` | Lời thoại chính | Highlight từng từ theo micro-timing Whisper | N/A (chạy ngầm) |
| `word_bounce` | Nhấn mạnh từ khoá then chốt | Phóng to 1.25x rồi nảy nhẹ về 1.0x, đổi màu neon | `pop` / `ding` |
| `ab_compare` | So sánh 2 mặt, "khác nhau", "vs" | Màn hình tách đôi hoặc 2 cột đối chiếu A vs B | `split_snap` |
| `big_counter` | Số tiền, phần trăm, năm biến động | Số to nhảy liên tục từ 0 đến con số đích | `tick_fast` + `cash_register` |
| `stack_list` | Liệt kê "1, 2, 3...", "3 điều cốt lõi" | Các gạch đầu dòng lần lượt rơi vào khung hình | `click` / `pop` |
| `step_cards` | Quy trình "Bước 1 làm X, Bước 2 làm Y" | Hộp các bước (Stepper) có số tròn nối thanh | `whoosh_soft` |
| `hand_circle` | Kêu gọi "Nhìn vào đây", "Lưu ý" | Nét cọ vẽ khoanh tròn rung rinh quanh đối tượng | `marker_draw` |
| `arrow_point` | Hướng dẫn thao tác, chỉ vào biểu đồ | Mũi tên cong vẽ tay rung nhẹ chỉ thẳng mục tiêu | `pop_arrow` |
| `highlighter` | Nhấn mạnh câu kết, luật bất thành văn | Vệt dạ quang vàng/xanh quét ngang dòng chữ | `marker_swipe` |
| `badge_tag` | Chú thích nhanh, ghi chú "Lưu ý", "Mẹo" | Thẻ badge dạng viên thuốc dán góc màn hình | `tape_stick` |
| `chapter_break`| Chuyển sang phần mới, luận điểm mới | Thẻ toàn màn hình chuyển cảnh mạnh kèm số mục | `cinematic_whoosh` |
| `tech_decode` | AI, thuật toán, công nghệ, mật mã | Chữ nhảy ký tự matrix/nhị phân rồi hiện rõ | `data_glitch` |
| `glow_text` | Insight bí quyết, đột phá bất ngờ | Chữ tỏa ánh sáng neon sáng rực nền đen | `riser_shimmer` |
| `typewriter` | Trích dẫn danh ngôn, lệnh gõ, mã code | Chữ gõ từng ký tự lách cách | `typewriter_key` |
| `slide_up` | Ý bổ trợ nhẹ nhàng, trích dẫn nguồn | Chữ trượt mượt mà từ dưới lên kèm mờ nét | `paper_glide` |
| `cinematic_blur`| Kể chuyện quá khứ, tâm sự, hồi tưởng | Chữ phóng to từ mờ sang nét trên nền tối | `wind_chime` |
| `handwriting` | Góc nhìn cá nhân, ghi chú viết tay | Font viết tay thảo nét mực mềm | `pencil_scratch` |
| `comment_box` | Kêu gọi "Bình luận ý kiến của bạn" | Hộp bình luận popup giả lập giao diện mạng xã hội | `notification_chime` |
| `outro_cta` | Kết thúc: Subscribe, Đọc bài viết | Thẻ CTA chuyển tiếp, avatar kênh, nút bấm nảy | `outro_ding` |

---

## 4. Bộ 20 Phong Cách Dựng Sẵn (20 Style Presets)

Khi người dùng ra lệnh kèm tên phong cách (ví dụ: `--style taichinh` hoặc `/kienthuc`), áp dụng trọn gói bảng thuộc tính sau:

1. **`/taichinh` (Tài chính & Vĩ mô):** Nền Navy `#0F172A`, điểm nhấn Gold `#EAB308`, font Be Vietnam Pro ExtraBold, visual: `big_counter`, `ab_compare`, nhạc: Lofi Finance, SFX: `cash_register`, `ding`.
2. **`/kienthuc` (Kiến thức chuyên gia):** Nền Trắng/Xám `#F8FAFC`, điểm nhấn Xanh `#2563EB`, visual: `highlighter`, `stack_list`, `arrow_point`, nhạc: Acoustic Piano.
3. **`/huongdan` (Hướng dẫn thao tác):** Màn hình app, visual: `step_cards`, `hand_circle`, `arrow_point`, SFX: `click`, `pop`.
4. **`/giaoduc` (Bài giảng & Học tập):** Phong cách phấn bảng / giấy kraft, visual: Quiz trắc nghiệm, Checklist, `badge_tag`.
5. **`/congnghe` (Công nghệ & AI):** Nền Đen `#09090B`, điểm nhấn Cyan Neon `#06B6D4`, visual: `tech_decode`, `glow_text`, SFX: `glitch`, `riser`.
6. **`/podcast` (Podcast & Phỏng vấn):** Subtitle 2 màu đối thoại, biểu đồ sóng âm (Waveform), khung viền người nói.
7. **`/review` (Đánh giá trải nghiệm):** Thanh đo 5 sao, cột So sánh Ưu / Nhược điểm, zoom cận cảnh chi tiết (Punch-in).
8. **`/sanpham` (Bán hàng & Khuyến mãi):** Tag giá đỏ gạch ngang, nhãn giảm giá nhấp nháy, thanh đồng hồ khẩn cấp đếm ngược.
9. **`/bds` (Bất động sản & Nội thất):** Gam màu be vàng sang trọng, font serif tinh tế, camera pan trôi chậm thư thái.
10. **`/thoitrang` (Thời trang & Làm đẹp):** Bố cục tạp chí lookbook, màu pastel, hiệu ứng cắt dán frame nghệ thuật.
11. **`/amthuc` (Ẩm thực & Món ngon):** Tone ấm cam/đỏ, chữ bo tròn mềm mại, SFX xèo xèo sôi sục.
12. **`/vlog` (Vlog đời sống):** Font viết tay `handwriting`, khung hình film retro hạt bụi, nhạc chill acoustic.
13. **`/tamsu` (Tâm sự & Tự sự):** Visual `cinematic_blur`, tone trầm tĩnh, nhịp đọc chậm rãi, piano đơn âm.
14. **`/dulich` (Du lịch & Khám phá):** Bản đồ vẽ đường đi GPS, tem dấu hộ chiếu, la bàn quay.
15. **`/thethao` (Thể thao & Fitness):** Chữ in hoa nghiêng thể thao (Italic Condensed), vệt màu neon đỏ/cam, SFX đấm bốc / đếm giây.
16. **`/sukien` (Sự kiện & Recap):** Hạt sáng lấp lánh (Light leaks/Particles), viền vàng gold, chuyển cảnh flash trắng.
17. **`/dienanh` (Điện ảnh điện quang):** Khung hình màn bạc 2.39:1 viền đen trên dưới, tone teal & orange, SFX sub-boom điện ảnh.
18. **`/tintuc` (Tin tức nóng hổi):** Băng đỏ Breaking News chạy chân, dấu đóng đỏ "KHẨN CẤP", còi stinger dồn dập.
19. **`/hai` (Hài hước & Meme):** Chữ viền đen dày hoạt hình nảy bật, sound effect meme cổ điển (boing, còi, trống kết).
20. **`/showcase` (Phô diễn kỹ xảo):** Chuyển cảnh liên tục mỗi 1.5 - 2 giây, đan xen đa dạng motion và SFX dồn dập để giữ mắt người xem.

---

## 5. Quy Chuẩn Vùng An Toàn 9:16 (Safe Zone Rules)

Khi kết xuất cho **TikTok, YouTube Shorts, Facebook Reels**, phải luôn tuân thủ nghiêm ngặt vùng an toàn:
* **Top 15% (Dead Zone):** Tránh đặt chữ vì bị che bởi Camera khoét lỗ, thanh tìm kiếm, tab đề xuất.
* **Bottom 25% (Dead Zone):** Tránh đặt nội dung trọng tâm vì bị che bởi Caption video, Tên kênh, Thanh chạy nhạc, Nút hành động.
* **Right 18% (Dead Zone):** Tránh đặt nút tương tác vì dính cụm nút Thích, Bình luận, Chia sẻ, Bookmark và Avatar chủ kênh.
* **Center Safe Zone (Y: 20% – 75%, X: 10% – 82%):**
  * Hook 2 tầng đặt ở `Y: 25% – 35%`.
  * Kinetic Captions đặt ở `Y: 60% – 72%`.
  * Visual Cues (biểu đồ, số đếm, ảnh minh họa) nằm ở trung tâm `Y: 35% – 60%`.

---

## 6. Chiến Lược Tự Động Sinh 3 Phương Án Ảnh Bìa (Thumbnails)

Mỗi video ngắn khi render phải xuất ra 3 file ảnh bìa đại diện tại thời điểm vàng (`thumbnail_a.jpg`, `thumbnail_b.jpg`, `thumbnail_c.jpg`) theo 3 góc tiếp cận khác nhau để A/B testing:
1. **Phương án A (Câu hỏi khiêu khích / Nghịch lý):** Chữ cực to chiếm 40% diện tích trung tâm (ví dụ: *"VÌ SAO ĐẦU TƯ CÀNG LÂU CÀNG LỖ?"*).
2. **Phương án B (Con số giật mình):** Nhấn mạnh vào số liệu hoặc phần trăm gây sốc (ví dụ: *"-80% TÀI SẢN TRONG 1 ĐÊM"*).
3. **Phương án C (So sánh Trước/Sau hoặc Đối nghịch):** Bố cục 2 nửa rõ ràng (ví dụ: *F0 BÁN ĐÁY vs TAY TO GOM HÀNG*).

> **Lưu ý Thumbnail:** Toàn bộ chữ chính phải nằm gọn trong khung vuông 1:1 ở giữa ảnh 9:16 để khi hiển thị trong lưới Profile (Profile Grid) của TikTok/Shorts không bao giờ bị cắt chữ.

---

## 7. Checklist Tự Động Đánh Giá Kịch Bản Trước Khi Dựng

- [ ] 3 giây đầu tiên đã có Hook đủ kích thích tò mò chưa (`hook_2tier` hoặc nghịch lý)?
- [ ] Có cảnh nào kéo dài quá 4 giây mà không đổi visual không (Quy tắc 3s-5s)?
- [ ] Các con số quan trọng trong lời nói đã được viết bằng chữ trong `text` và viết bằng ký hiệu trong `visual` chưa?
- [ ] Đã gán đúng các Semantic Visual Cues phù hợp với từng câu nói chưa (So sánh A/B, Big Counter, Gạch dạ quang, Stepper)?
- [ ] Đã gán SFX tương ứng vào các điểm nhấn (`whoosh`, `pop`, `cash_register`, `sub_boom`, `ding`)?
- [ ] Toàn bộ chữ và hình đã nằm trong Vùng An Toàn (Safe Zone) 9:16 chưa?
- [ ] Đã chuẩn bị 3 phương án tiêu đề cho Thumbnail chưa?
- [ ] Đã có disclaimer giáo dục và Outro CTA ở cảnh cuối chưa?
