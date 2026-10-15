# Giá của tiền · bảng phân cảnh

> Bà Tư đi gửi tiết kiệm, Minh nhận tin khoản vay tăng lãi, và hai bà cháu hiểu lãi suất là giá của tiền.

**Ảnh (nhân vật + khung hình):** tạo tự động bằng API, có báo chi phí trước khi chạy:

```bash
node scripts/story-images.mjs videos/story-gia-cua-tien/script.json          # xem danh sách ảnh và chi phí
node scripts/story-images.mjs videos/story-gia-cua-tien/script.json --yes    # tạo các ảnh còn thiếu
```

**Video 🎬 (Flow → Veo):** làm tay theo mục 3. Trước khi tải, chạy lệnh dưới đây; file tải về sẽ tự đổi tên và chuyển vào `media/`:

```bash
node scripts/story-import.mjs videos/story-gia-cua-tien/script.json
```

Xong thì dựng phim: `node scripts/story.mjs videos/story-gia-cua-tien/script.json`. Thiếu file nào thì cảnh đó hiện khung giữ chỗ.

## 1. Ảnh tham chiếu nhân vật

### Minh — ✅ `media/char-minh.png`

```text
Character reference sheet of Minh: Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack. Show the same character three times side by side: front view, three-quarter view, side view, full body, neutral pose, plain light background. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9.
```

### Bà Tư — ✅ `media/char-ba.png`

```text
Character reference sheet of Bà Tư: Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet. Show the same character three times side by side: front view, three-quarter view, side view, full body, neutral pose, plain light background. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9.
```

## 2. Khung hình từng cảnh

| Cảnh | Loại | Lời | File |
| --- | --- | --- | --- |
| s01 | 🖼 ảnh | Sau chuyện chiếc lọ, bà Tư quyết định không cất tiền trong lọ nữa. Bà nhờ Minh chở ra ngân hàng đầu phố. | ✅ `media/s01.png` |
| s02 | 🎬 video | Sáng hôm đó, hai bà cháu len qua con hẻm quen. | ✅ `media/s02.png`<br>✅ `media/s02.mp4` |
| s03 | 🖼 ảnh | **Bà Tư:** Cô nhân viên nói năm nay lãi gửi cao hơn năm ngoái. Tiền mà cũng có lúc lên giá, xuống giá hả con? | ✅ `media/s03.png` |
| s04 | 🖼 ảnh | **Minh:** Đúng rồi bà. Bà cho ngân hàng mượn tiền, thì ngân hàng trả bà tiền công. Tiền công đó chính là lãi. | ✅ `media/s04.png` |
| s05 | 🖼 ảnh | Người cần tiền phải trả giá để được dùng tiền. Người có tiền thì nhận cái giá đó. Mức giá ấy gọi là lãi suất, tức giá của tiền. | ✅ `media/s05.png` |
| s06 | 🖼 ảnh | Tối đó, Minh nhận tin nhắn: khoản vay mua xe của cậu được tính lại lãi, mỗi tháng phải trả thêm một chút. | ✅ `media/s06.png` |
| s07 | 🖼 ảnh | **Minh:** Bà được thêm lãi, còn con phải trả thêm lãi. Cùng một giá tiền mà nhà mình một người vui, một người lo. | ✅ `media/s07.png` |
| s08 | 🖼 ảnh | **Bà Tư:** Vậy ai định ra cái giá đó vậy con? | ✅ `media/s08.png` |
| s09 | 🎬 video | Ngân hàng Nhà nước điều hành mức lãi suất gốc của cả hệ thống. Khi mức gốc thay đổi, lãi gửi và lãi vay thường đổi theo, sau một độ trễ. | ✅ `media/s09.png`<br>✅ `media/s09.mp4` |
| s10 | 🖼 ảnh | **Minh:** Nên muốn hiểu túi tiền nhà mình, con phải để ý lãi suất nữa, chứ không chỉ giá tô phở đâu bà. | ✅ `media/s10.png` |
| s11 | 🖼 ảnh | Lãi suất là gì, và Ngân hàng Nhà nước điều hành nó ra sao? Mời bạn đọc bài viết bên dưới video. | ✅ `media/s11.png` |

### s01 🖼 — ✅ `media/s01.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: The grandmother hands Minh a small cloth pouch of savings at the front door, the now-empty small brown glazed ceramic jar visible on the cabinet behind them, morning light, Minh smiling with his motorbike key. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s02 🎬 — ✅ `media/s02.png`

Đính kèm: `media/char-minh.png`, `media/char-ba.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack); Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet). Scene: Minh rides a small motorbike slowly through the narrow alley with his grandmother sitting sideways on the back seat, both wearing simple helmets. Setting: Narrow Saigon alley at late afternoon, motorbikes parked, small street-side phở stall with a steaming pot, red plastic stools, hanging bulbs. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s03 🖼 — ✅ `media/s03.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: At the bank counter, the grandmother turns to Minh with a curious, amused look, holding a small savings booklet, Minh standing beside her. Setting: Small neighborhood bank branch interior in Saigon, simple wooden counter with a glass partition, plain cream walls, ceiling fans, potted plants, a few waiting chairs, no logos, no signage, no readable text. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s04 🖼 — ✅ `media/s04.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Medium shot, Minh explains cheerfully with an open hand gesture, sitting on a waiting chair in the bank, soft daylight. Setting: Small neighborhood bank branch interior in Saigon, simple wooden counter with a glass partition, plain cream walls, ceiling fans, potted plants, a few waiting chairs, no logos, no signage, no readable text. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s05 🖼 — ✅ `media/s05.png`

```text
Scene: Symbolic still life: an old balance scale on a wooden table, a small stack of banknotes on one side and a small brass clock on the other side, warm light, quiet and thoughtful. Setting: Small neighborhood bank branch interior in Saigon, simple wooden counter with a glass partition, plain cream walls, ceiling fans, potted plants, a few waiting chairs, no logos, no signage, no readable text. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s06 🖼 — ✅ `media/s06.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Evening at home, Minh sits on a wooden stool looking at his phone screen with a worried frown, his motorbike parked inside the doorway, warm lamp light. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s07 🖼 — ✅ `media/s07.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Two-shot in the evening living room, Minh shows his phone to his grandmother with a rueful laugh, she holds her savings booklet and smiles teasingly. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s08 🖼 — ✅ `media/s08.png`

Đính kèm: `media/char-ba.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet). Scene: Medium close-up, the grandmother tilts her head with genuine curiosity, eyebrows raised, warm lamp light. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s09 🎬 — ✅ `media/s09.png`

```text
Scene: Symbolic shot: a single drop of water falls into a calm round stone basin in a quiet courtyard, ripples spread outward and gently rock several small floating leaves near the edge. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s10 🖼 — ✅ `media/s10.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Minh and his grandmother sit together at a small table with tea, he points at a simple hand-drawn ripple sketch in his notebook, she laughs, cozy evening light. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

### s11 🖼 — ✅ `media/s11.png`

```text
Scene: The empty small brown glazed ceramic jar on the wooden cabinet next to a small savings booklet with a plain cover and no writing, evening lamp light, peaceful ending. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.
```

## 3. Đoạn video (Flow → Veo, chế độ Frames to Video)

Chọn ảnh khung hình của cảnh làm **khung đầu**, dán câu lệnh, chọn bản Fast để tiết kiệm credit. Tải về dạng MP4.

### s02 — ✅ `media/s02.mp4`

Khung đầu: `media/s02.png`

```text
Minh rides a small motorbike slowly through the narrow alley with his grandmother sitting sideways on the back seat, both wearing simple helmets. Characters: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack); Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet). Camera and motion: Side tracking shot moving with the motorbike at walking speed, morning light, neighbors and plants passing by, gentle natural movement, no dialogue. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. 8 seconds, ambient sound only, no speech, no music, no text on screen.
```

### s09 — ✅ `media/s09.mp4`

Khung đầu: `media/s09.png`

```text
Symbolic shot: a single drop of water falls into a calm round stone basin in a quiet courtyard, ripples spread outward and gently rock several small floating leaves near the edge. Camera and motion: Static close camera, slow motion drop, concentric ripples travelling outward and reaching the leaves one after another, calm ambient sound, no dialogue. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. 8 seconds, ambient sound only, no speech, no music, no text on screen.
```

## Tiến độ

15/15 file đã có. 2 cảnh video ≈ 2 lượt Veo (chưa tính tạo lại).
