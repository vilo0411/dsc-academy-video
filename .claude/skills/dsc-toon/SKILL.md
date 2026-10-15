---
name: dsc-toon
description: Viết và dựng video hoạt hình DSC Academy định dạng toon — gồm tập chuỗi Kinh tế vĩ mô (người que An, cảnh dựng sẵn bằng visual.type, không cần vẽ) và hoạt hình kể chuyện kiểu OverSimplified (scenes.mjs vẽ tay). Dùng khi làm tập tNN mới, video toon-*, hoặc thêm beats/punch/gag/chuyển cảnh cho cảnh hoạt hình.
---

# Toon: người que + hoạt hình kể chuyện trên một bộ dựng

Bộ dựng `scripts/build-toon.mjs`. Mỗi cảnh trong `script.json`:
- có `visual.type` → **cảnh dựng sẵn** (`scripts/lib/toon-presets.mjs`): hình người que quen thuộc, toàn khung, An dạng rối nhép miệng theo giọng;
- không có → vẽ tay trong `videos/<id>/scenes.mjs` (đọc `docs/toon-guide.md` trước khi viết).
Hai cách dùng chung được trong một video. Mẫu: `videos/demo-toon-series/` (chỉ dựng sẵn), `videos/toon-lich-su-lam-phat/` (vẽ tay).

Mốc từng từ: Whisper trên máy và trên GitHub (`scripts/lib/words.mjs`); thiếu Whisper thì chia đều theo âm tiết (bản dựng ghi ⚠). Chưa có giọng thì `--no-voice` dựng không tiếng với thời lượng ước lượng.

## 1. Tập chuỗi vĩ mô (3–4 phút)

`npm run new -- tNN-<slug> "Tiêu đề"` → khung 9 cảnh có `section` theo 8 phần: mở đầu, tập trước, khái niệm, đọc số liệu, chuỗi tác động, ví dụ, tóm tắt + quiz, gieo tập sau + CTA.
- 600–750 âm tiết, 20–30 cảnh; mỗi cảnh ≤ 25 âm tiết để hình đổi 3–5 giây (QA báo `⚠ Nhịp hình`).
- Câu móc 3 giây đầu: nghịch lý, con số, câu hỏi gắn đời thường. Re-hook mỗi 45–90 giây ("nhưng…", "vì thế…", câu hỏi mở).
- Viết đủ "Ngân hàng Nhà nước", "đô la Mỹ". Cảnh cuối `outro` có `disclaimer`.
- `"thumbnailAt"` (giây) chọn khung thumbnail.

### Kiểu cảnh (`visual.type`)
Cơ bản: `title` (headline, sub), `formula` (left, top, bottom), `numbers`, `calc` (expr, result; biểu cảm ở `face`), `coins`, `trend`, `split`, `compare`, `warning`, `checklist` (items[]), `outro` (headline, sub, disclaimer → thẻ cuối). Mẫu: tìm `"type": "<kiểu>"` trong `videos/t0*/script.json`.

| type | Trường |
| --- | --- |
| `dashboard` | headline?, show[], reveal[], blink, lit[] — nhóm: growth, prices, money, external, fiscal |
| `chain` | headline?, highlight: profit/valuation/both/none, dir: up/down, caption? |
| `pair` | headline?, items[{company, rows[{k,v}], move: up/down/downBig/flat, moveLabel}] |
| `versus` | headline?, left{title,text}, right{title,text} |
| `tide` | headline, sub |
| `quiz` | question, options[3], footer? |
| `notebook` | entries[] (dòng cuối là dòng mới của tập) |
| `line` | series[{name, points, color, dashed}], yMin, yMax, band, threshold, xLabels, valueLabels |
| `cycle` | active, from, reveal, sectors |
| `gauge` | min, max, mid, value, from, left, right |
| `stack` | items[{label, sub}], op, result |
| `table` | columns[], rows[], highlight, note |
| `steps` | items[{title, text, tone}], vertical, numbered |
| `scale` / `seesaw` | left, right, tilt / dir |
| `tank` | inflows, outflows, from, to, label |
| `slider` | steps[{value, x, label}], label, unit |
| `grid` | cols, items[{title, text, tone}] |
| `chips` | chips[], highlight, dim |
| `calendar` | month, offset, events[{day, label, tone}] |

### Nhịp, máy quay, gag trên cảnh dựng sẵn
- `beats: ["từ", …]` — từ khoá cho từng mục hiện lần lượt (theo thứ tự hiện của kiểu cảnh: nhãn/tiêu đề trước rồi các mục). Bỏ trống thì rải theo lời.
- `punch: "từ"` hoặc `{ at, x, y, z }` — phóng nhanh vào đúng từ khoá. `shake: "từ"` — rung khung (cảnh `warning` tự rung).
- `trans`: whip, zoom, zoomOut, slice, iris, wipe, slam, cut. Mặc định: đổi `section` → `wipe` (giấy kraft); trong cùng phần xoay vòng whip/slice/iris (không lặp liền nhau). `transOpts` cho `dir`, `cx`, `cy`.
- `drift: false` hoặc `{ z, origin }` (mặc định trôi nhẹ 1,035). `lead` (khoá cả tập, mặc định 0,12 giây): hình vào trước lời một nhịp (J-cut).
- `gag: { at, dur, sticker, bg, expr, pose, sound, sweat }` — cắt cận mặt An phản ứng, 2–3 lần mỗi video, ở cú sốc của câu chuyện. Không bóng thoại.
- `host: false` — bỏ An, cảnh dùng cả bề ngang.
- `hush: true` (trên cảnh, cần `"mix": "v2"`): nhạc lặng ngay trước câu chốt.

### Nhân vật An
- `pose`: idle, point, pointUp, present, wave, cheer, think, shrug, hips, headHold, facepalm (đổi theo cảm xúc câu thoại, không lặp quá 3 cảnh liền). Trước mỗi tư thế An nhún một nhịp (anticipation).
- `expr` (cảnh `calc` dùng `face`): happy, excited, surprised, worried, sad, thinking, confused, confident, neutral. `emote`: question, exclaim, bulb, sweat, sparkle.
- Trang phục rối: `"character"` là vai trong `scripts/lib/puppet.mjs` (mặc định `an`).
- Bộ dựng cũ (`format: "series"`, 12 tập đã giao) dùng `scripts/lib/figure.mjs`: `"character"` an, mai, minh, thay, lan, tuan và `"look"` {hair, hat, glasses, face, outfit, skin, hairColor, outfitColor, hatColor, cheeks}.

## 2. Hoạt hình kể chuyện (scenes.mjs)

Đọc `docs/toon-guide.md`. Tóm tắt: cảnh dùng trọn khung, chuyển cảnh có chủ đích, máy quay trôi + punch-in đúng từ khoá; vật hiện theo `at(cảnh, "từ")` rồi `k.idle`; tiêu đề `kline` + `fx.words`, tô `fx.mark`; gag `k.gag` 2–3 lần; `sources` có nguồn.
Hiệu ứng mới (GSAP plugin miễn phí, tự nạp khi dùng): `fx.morph(sel, shape, t)` cho match cut (đồng xu → bánh xe), `fx.draw(sel, t)` cho nét vẽ hiện dần kiểu bảng trắng; `k.anticipate(id, t)` cho rối.
Nhân vật vẽ bằng Nano Banana: `cast` trong `script.json` → `node scripts/toon-cast.mjs videos/<id>/script.json` (báo phí, `--yes` khi được đồng ý). Video có `cast` chỉ dựng trên máy.

## 3. Kiểm tra
`npm run lint -- <id>` kiểm cả `beats`/`punch`/`gag.at` có trong lời. Bản dựng in `⚠ Mốc từ dễ lệch` khi Whisper nghe nhầm từ neo: đổi sang từ bên cạnh. Sau render dùng skill **dsc-qa**.
