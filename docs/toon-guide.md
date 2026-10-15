# Hoạt hình kiểu OverSimplified (`format: "toon"`)

Video kể chuyện vui, nhịp nhanh: cảnh dùng trọn khung, máy quay luôn chuyển động, mỗi lớp hình hiện đúng lúc lời đọc nhắc tới, có gag cận mặt nhân vật phản ứng. Tham chiếu: OverSimplified, Học viện Bò và Gấu. Mẫu: `videos/toon-lich-su-lam-phat/`.

## Luồng làm

1. `npm run new -- toon-<slug> "Tiêu đề"` → `script.json` (lời, giọng, nhạc) + `scenes.mjs` (hình).
2. Viết lời trong `script.json` như video essay (số viết theo cách đọc, `sources` có nguồn). `npm run lint -- <id>`.
3. Lần đầu cần giọng: `npm run video -- <id> --build-only` dừng ở mã 2 → báo phí → `--api` khi được đồng ý (hoặc đẩy `script.json` lên `main`, GitHub tạo giọng + nhạc, rồi `npm run pull -- <id>`).
4. Nhân vật vẽ bằng AI (tuỳ chọn, có phí): khai báo `cast` trong `script.json`, `node scripts/toon-cast.mjs videos/<id>/script.json` báo chi phí (~0,14 USD/ảnh model pro), `--yes` mới gọi Nano Banana khi người dùng đồng ý. Ảnh ở `videos/<id>/media/cast/<vai>-<tư thế>.png` + `.cut.png` (đã tách nền, `--cut` để tách lại không gọi API). Xem ảnh trước khi dùng: AI đôi khi vẽ lỗi (chân mờ xuyên áo…).
5. Viết `scenes.mjs`, dựng lại bằng `--build-only`, xem khung: `cd videos/<id>/project && npx hyperframes snapshot --describe false --no-end -o ../.work/snaps --at 3,8,15`.
6. `npm run video -- <id>` → mp4/srt/jpg trong `videos/<id>/`.

Mốc từng từ lấy bằng Whisper (`whisper-cli`, mô hình ở `assets/models/whisper/`; GitHub cũng có Whisper, xem `render.yml`) qua `scripts/lib/words.mjs` → `.work/words.json` (kèm độ tin cậy). Không có Whisper thì chia đều theo âm tiết. Video có `cast` (ảnh AI trong `media/`) chỉ dựng trên máy.

**Cảnh dựng sẵn:** cảnh nào có `visual.type` (kiểu cảnh người que: title, dashboard, chain, quiz…) thì không cần vẽ trong `scenes.mjs` — xem skill `dsc-toon` và `scripts/lib/toon-presets.mjs`. Mẫu chỉ dùng cảnh dựng sẵn: `videos/demo-toon-series/`.

## Nguyên tắc hình

- Không có người dẫn cố định ở góc; cảnh nào cũng dùng trọn khung. Nhân vật diễn trong cảnh.
- Mỗi lần đổi ý là một chuyển cảnh có chủ đích; không dùng hai kiểu giống nhau liền nhau, cắt cứng chỉ cho nhịp đùa.
- Vật xuất hiện đúng từ khoá (`at(cảnh, "từ")`), sau đó không đứng yên (`k.idle`).
- Gag cận mặt An: 2–3 lần mỗi video, ở cú sốc của câu chuyện (≥ 0,6 giây, che được cả lần chuyển cảnh).
- **Không** thêm bóng thoại/lời thoại hư cấu cho nhân vật. Gag hình phải gắn với sự kiện thật (xe cút kít chở tiền Đức 1923).
- Chữ lớn: `kline` hiện từng từ theo lời (`fx.words`), `sticker: true` cho tiêu đề nổi trên nền rối, `fx.mark` tô bút dạ cụm quan trọng.

## Bộ công cụ `k` trong `scenes.mjs`

```js
export default function (k) {
  const { at, seq, stagger, S, E, T, fx, A } = k;
  k.scene("c1", `<svg viewBox="0 0 1920 1080" …>…</svg>`, { at: 0 });
  …
}
```

Thời gian (giây, từ Whisper; cảnh là chỉ số 0… hoặc id "s03"):
- `S[i]`, `E[i]`: đầu/cuối lời cảnh i; `TOTAL`.
- `at(cảnh, "từ", n=0)`: lúc bắt đầu đọc lần thứ n của từ. `seq(cảnh, "từ", n)`: mốc n từ liên tiếp. `stagger(t, n, bước)`.

Khung cảnh:
- `k.scene(id, html, { at, trans, opts, shift, drift, z })`: `trans` = `whip` (opts `dir: ±1`, `axis: "y"`), `zoom` (xuyên qua điểm `cx, cy` của cảnh cũ), `zoomOut`, `slice` (cắt chéo kiểu truyện tranh), `iris` (`cx, cy`), `wipe` (giấy kraft), `slam` (chớp trắng), `cut`. `shift`: dời SVG sang trái (px) cho cân khung. `drift`: `false` hoặc `{ z, origin, x, y, bg }` (`bg` = nền phòng trôi ngược để có chiều sâu). `z: 850` cho thẻ cuối.
- `k.cut(id, t, trans, opts)`: quay lại cảnh đã có (bản đồ dùng chung). Lớp bên trong cảnh: `#id-d` (máy trôi), `#id-p` (punch, `fx.shake("#id-p", t)`).
- `k.punch(id, t, x, y, { z, hold })`, `k.idle(sel, t0, t1, { y, rot, period })` (chọn phần tử không có `transform` riêng, ví dụ `#usd-body`), `k.stamp(t, "1923" | null)`, `k.overlay(html)`, `k.gag({ key, t0, t1, bg, ray, pose, expr, sticker, sound, tilt, sweat })`, `k.endCard({ title, sub, cta, disclaimer })`, `k.captionsUntil(t)`.

Hoạt cảnh (`fx`, ghi cả tiếng động): `pop`, `slam`, `slideIn`, `count`, `shake`, `cam`/`camSet` (máy quay trong cảnh, nhóm `.cam`), `words`, `mark`, `hide`/`show`, `sound(t, kind)`, `morph(sel, shape, t)` (MorphSVG: match cut đồng xu → bánh xe; `shape` là `#id` hoặc chuỗi path), `draw(sel, t)` (DrawSVG: nét hiện dần, phần tử cần `stroke`). Plugin GSAP tự nạp khi dùng. Rối: `k.anticipate(id, t)` nhún trước động tác. Lệnh GSAP tự viết: `A(\`tl.to("#x", {…}, ${T(t)});\`)`; `fromTo` trên phần tử xuất hiện lại cần `immediateRender: false` và đích có `opacity: 1` nếu phần tử ẩn sẵn.

Nhân vật AI (`cast`):
```json
"cast": {
  "style": "phong cách chung (viền đen dày, đầu to, mắt to, găng tay trắng…)",
  "an": { "look": "ngoại hình, trang phục (không chữ/logo)", "poses": { "base": "toàn thân…", "shock": "cận từ ngực trở lên…" } }
}
```
`base` vẽ trước; các tư thế khác gửi kèm `base` để giữ đúng nhân vật. Trong `scenes.mjs`: `k.gag({ …, img: "an-shock", imgH, imgBottom, wobble })` (imgBottom < 1 để cắt phần dưới ảnh ra khỏi khung), `k.sprite(id, "an-base", x, y, h)` (ảnh trong SVG, ẩn sẵn — hiện bằng `fx.pop`), `k.endCard({ …, cast: "an-base" })`. Ảnh AI không nhép miệng; chuyển động bằng co giãn, nảy, lắc.

Hình vẽ sẵn: `room(tường, sàn, đồ nền)`, `worldMap({ colors, fit, extent })` (`map.P(lon, lat)`), `flagBall`, `ballMood`, `nameTag`, `banner`, `stampBox`, `kline`, `note`, `bundle`, `logs`, `coin`, `bread`, `bowl`, `barrow`, `panel`, `H`; nhân vật `puppetSVG(id, vai, { x, y, dir, scale })` với vai `an, minh, ba, frau, soldier, emperor, pho, pilot`, điều khiển bằng `pose`, `expr`, `blinks`, `breathe`, `hop`, `lipSync`. Thêm đạo cụ mới vào `scripts/lib/toon-props.mjs`.

Tiếng động được lọc theo quy chuẩn trong `docs/audio-guide.md` (≈ 30–45 tiếng/phút): cứ gắn tiếng cho hiệu ứng, bước dựng tự bỏ tiếng dày/lặp; tiếng phải giữ thì `fx.sound(t, kind, gain, 1)`.

Tiếng động: `pop, swish, whoosh, slide, tap, stamp, hit, ding, snap, riser, tick, pen, key, tape, zip, boing, scratch`.
