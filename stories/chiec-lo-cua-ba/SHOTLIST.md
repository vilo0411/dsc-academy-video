# Chiếc lọ của bà · bảng phân cảnh

> Minh tìm thấy tờ một trăm nghìn bà cất từ mười năm trước và hiểu ra lạm phát là gì.

**Ảnh (nhân vật + khung hình):** tạo tự động bằng API, có báo chi phí trước khi chạy:

```bash
node scripts/story-images.mjs stories/chiec-lo-cua-ba/story.json          # xem danh sách ảnh và chi phí
node scripts/story-images.mjs stories/chiec-lo-cua-ba/story.json --yes    # tạo các ảnh còn thiếu
```

**Video 🎬 (Flow → Veo):** làm tay theo mục 3. Trước khi tải, chạy lệnh dưới đây; file tải về sẽ tự đổi tên và chuyển vào `media/`:

```bash
node scripts/story-import.mjs stories/chiec-lo-cua-ba/story.json
```

Xong thì dựng phim: `node scripts/story.mjs stories/chiec-lo-cua-ba/story.json`. Thiếu file nào thì cảnh đó hiện khung giữ chỗ.

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
| s01 | 🖼 ảnh | Mười năm trước, bà Tư nhét vào chiếc lọ sành một tờ một trăm nghìn đồng, dặn rằng để dành mua quà cho cháu. | ✅ `media/s01.png` |
| s02 | 🎬 video | Mười năm sau, Minh dọn nhà giúp bà và tìm thấy chiếc lọ phủ đầy bụi. | ✅ `media/s02.png`<br>✅ `media/s02.mp4` |
| s03 | 🖼 ảnh | **Minh:** Bà ơi, trong lọ có tiền nè! Của bà cất hồi nào vậy? | ✅ `media/s03.png` |
| s04 | 🖼 ảnh | **Bà Tư:** Hồi đó, chừng ấy đủ cho con ăn hai tô phở, còn dư ly chè đó. | ✅ `media/s04.png` |
| s05 | 🎬 video | Tò mò, Minh mang tờ tiền ra quán phở đầu hẻm. | ✅ `media/s05.png`<br>✅ `media/s05.mp4` |
| s06 | 🖼 ảnh | **Minh:** Giờ tờ này chỉ đủ một tô, mà không có chè luôn bà ơi. | ✅ `media/s06.png` |
| s07 | 🖼 ảnh | Tờ tiền vẫn y nguyên. Thứ thay đổi là giá cả quanh nó. Người ta gọi đó là lạm phát. | ✅ `media/s07.png` |
| s08 | 🖼 ảnh | **Bà Tư:** Vậy tiền để trong lọ, tự nó teo lại hả con? | ✅ `media/s08.png` |
| s09 | 🖼 ảnh | **Minh:** Không phải teo đâu bà, mà là mua được ít hơn. Con sẽ tìm hiểu kỹ cách giữ sức mua của đồng tiền. | ✅ `media/s09.png` |
| s10 | 🖼 ảnh | Lạm phát là gì, và đọc chỉ số giá tiêu dùng ra sao? Mời bạn đọc bài viết bên dưới video. | ✅ `media/s10.png` |

### s01 🖼 — ✅ `media/s01.png`

Đính kèm: `media/char-ba.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet). Scene: Close-up of the grandmother's hands rolling a 100,000 VND banknote and slipping it into a small brown glazed ceramic jar on a wooden cabinet, nostalgic soft light, slightly faded colors suggesting the past. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s02 🎬 — ✅ `media/s02.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Minh kneels by the wooden cabinet, wipes dust off the small brown ceramic jar, lifts the lid and peeks inside with curiosity. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s03 🖼 — ✅ `media/s03.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Medium shot, Minh holds up a slightly yellowed 100,000 VND banknote, smiling with surprise, looking off-screen toward his grandmother. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s04 🖼 — ✅ `media/s04.png`

Đính kèm: `media/char-ba.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet). Scene: Medium close-up, the grandmother sits on a wooden chair, laughing softly, eyes crinkled with memory, warm backlight. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s05 🎬 — ✅ `media/s05.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Wide shot, Minh walks down the narrow alley toward the steaming street-side phở stall holding the banknote. Setting: Narrow Saigon alley at late afternoon, motorbikes parked, small street-side phở stall with a steaming pot, red plastic stools, hanging bulbs. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s06 🖼 — ✅ `media/s06.png`

Đính kèm: `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Minh sits on a red plastic stool with one bowl of phở in front of him, the banknote on the table, wry funny expression, talking on his phone. Setting: Narrow Saigon alley at late afternoon, motorbikes parked, small street-side phở stall with a steaming pot, red plastic stools, hanging bulbs. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s07 🖼 — ✅ `media/s07.png`

```text
Scene: Symbolic shot: the same 100,000 VND banknote on the table between two bowls of phở, one bowl vivid and near, the other fading like a memory, steam curling. Setting: Narrow Saigon alley at late afternoon, motorbikes parked, small street-side phở stall with a steaming pot, red plastic stools, hanging bulbs. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s08 🖼 — ✅ `media/s08.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Two-shot at home, Minh back from the alley showing the banknote, the grandmother peers at it with a puzzled, playful frown. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s09 🖼 — ✅ `media/s09.png`

Đính kèm: `media/char-ba.png`, `media/char-minh.png`

```text
Using the attached reference image(s), keep the characters exactly consistent: Bà Tư (Vietnamese grandmother, about 75 years old, small and slightly stooped, silver hair in a low bun, kind wrinkled face, plum-purple áo bà ba with tiny white flowers, black trousers, jade bracelet); Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Scene: Minh sits beside his grandmother, gently explaining with a notebook, she nods, warm evening light, cozy atmosphere. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

### s10 🖼 — ✅ `media/s10.png`

```text
Scene: The small brown ceramic jar back on the wooden cabinet, empty, sunset light through the window grille, peaceful ending. Setting: Old Vietnamese tube house in Saigon, wooden cabinet, tiled floor with patterned cement tiles, sunlight through a window with iron grille, potted plants. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. Aspect ratio 16:9, leave some calm space in the lower third for subtitles.
```

## 3. Đoạn video (Flow → Veo, chế độ Frames to Video)

Chọn ảnh khung hình của cảnh làm **khung đầu**, dán câu lệnh, chọn bản Fast để tiết kiệm credit. Tải về dạng MP4.

### s02 — ✅ `media/s02.mp4`

Khung đầu: `media/s02.png`

```text
Minh kneels by the wooden cabinet, wipes dust off the small brown ceramic jar, lifts the lid and peeks inside with curiosity. Characters: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Camera and motion: Slow push-in, dust particles floating in the sunbeam, Minh gently lifts the jar lid, subtle natural movement, no dialogue. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. 8 seconds, ambient sound only, no speech, no music, no text on screen.
```

### s05 — ✅ `media/s05.mp4`

Khung đầu: `media/s05.png`

```text
Wide shot, Minh walks down the narrow alley toward the steaming street-side phở stall holding the banknote. Characters: Minh (Vietnamese man, 25 years old, slim, short black hair with a soft side part, round thin-rimmed glasses, light blue short-sleeve shirt, beige chinos, canvas backpack). Camera and motion: Tracking shot following Minh from behind as he walks toward the phở stall, steam rising, bulbs swaying slightly, a motorbike passes in the background. Style: Warm Vietnamese storybook illustration, soft watercolor and gouache textures, hand-drawn ink outlines, warm afternoon light, muted earthy palette with teal accents, gentle film grain, cinematic composition, no text, no logos, no watermark. 8 seconds, ambient sound only, no speech, no music, no text on screen.
```

## Tiến độ

14/14 file đã có. 2 cảnh video ≈ 2 lượt Veo (chưa tính tạo lại).
