# Thư viện âm thanh dùng chung

Mọi video (người que, essay, toon) chọn nhạc nền, ambience, stinger và bộ tiếng động từ `assets/audio/` — lưu trong git nên render được cả trên máy lẫn GitHub, không tốn API mỗi video.

## Xem thư viện có gì

```
npm run audio -- list                      # mọi thứ, kèm danh sách mood
npm run audio -- list --kind music --mood calm
npm run audio -- play doc-curious-piano    # nghe
npm run audio -- try upbeat-indie-ukulele t01 --seconds 30 --play   # trộn thử dưới giọng của video t01
```

`try` ghi `videos/<id>/.work/try-<bài>.mp3`. Nhạc tự hạ khi có lời, giống bản dựng thật.

## Chọn trong `script.json`

Mọi khoá đều tuỳ chọn. Không có khoá nào thì video giữ nguyên như trước.

```json
"music": "doc-curious-piano",
"music": { "track": "doc-curious-piano", "volume": 1.2 },
"music": { "mood": "calm", "energy": 2 },
"ambience": [{ "track": "market-crowd", "from": "s03", "to": "s05", "volume": 1 }],
"stingers": { "intro": "chime-intro", "outro": "soft-outro" },
"sfxSet": "playful"
```

| Khoá | Ý nghĩa |
| --- | --- |
| `music` | id, `{track, volume}`, hoặc `{mood, energy}` để tự chọn (cố định theo id video nên lần dựng nào cũng ra cùng một bài). Essay/toon vẫn dùng được `{prompt, …}` để tạo nhạc Lyria riêng như cũ. `volume` mặc định 1,5. |
| `ambience` | Tiếng nền (mưa, chợ…) từ cảnh `from` tới hết cảnh `to` (bỏ trống thì phủ cả video). Fade hai đầu, tự hạ khi có lời. |
| `stingers` | `intro` phát ở giây 0, `outro` phát ở đầu cảnh cuối. |
| `scene.stinger` | Trên một cảnh, nhận cả stinger lẫn tiếng động `sfx-…` (vd. `"sfx-cash-register"`, `"sfx-applause"`): `"quiz-reveal"` hoặc `{ "track": "quiz-reveal", "at": 0.6 }` (`at` 0–1 trong phần lời của cảnh). |
| `sfxSet` | Đổi cả bộ tiếng động: `paper` (giấy, mặc định của essay), `playful` (pop/swish/boing), `news` (blip/tock/glitch), `soft` (nhẹ, bỏ tiếng mạnh), `none`. Người que chỉ có tiếng động khi đặt khoá này (chuyển cảnh, quiz, số liệu, outro). |

`npm run lint` báo lỗi khi id không có, sai loại, mood không có bài nào, hoặc `from`/`to` không phải id cảnh.

## Quy chuẩn tiếng động (`sfxBudget`, `scripts/lib/sound.mjs`)

Mỗi hiệu ứng tự gắn tiếng của nó (vật hiện ra, mỗi bước bộ đếm, mỗi từ của chữ động…), cộng lại dễ thành 100+ tiếng/phút và một tiếng lặp hàng chục lần. Trước khi tổng hợp, tiếng động được lọc theo quy chuẩn (đang áp cho video toon):

| Cấp | Gồm | Quy tắc |
| --- | --- | --- |
| 1 — nhịp chính | chuyển cảnh, gag, tiếng cao dần (riser) | luôn giữ |
| 2 — vật chính | vật/nhãn xuất hiện, con dấu, cú đập, chuông cuối bộ đếm | giữ nếu cách tiếng trước ≥ 0,9 s |
| 3 — trang trí | tick bộ đếm, gõ phím từng từ, bút, dây | chuỗi liền nhau chỉ giữ tiếng đầu, và cũng phải còn chỗ |

- Cùng một tiếng không lặp lại trong 1,6 s; tiếng cấp 2–3 nằm trong 0,3 s trước một nhịp chính thì nhường.
- Mỗi lần phát lệch cao độ ±6% nên tiếng lặp không giống hệt nhau.
- Mục tiêu khoảng 30–45 tiếng/phút, rải đều (log dựng in `Tiếng động: giữ X/Y (Z tiếng/phút)`; danh sách ở `videos/<id>/.work/sfx.json`).
- Chỉnh trong kịch bản: `"sfxRules": { "minGap": 0.9, "sameGap": 1.6 }` (giảm `minGap` = nhiều tiếng hơn). Hiệu ứng tự viết có thể đặt cấp: `fx.sound(t, kind, gain, prio)`.

## Ghi công

Bài CC BY / BY-SA phải ghi công. Khi video dùng bài đó, bước dựng ghi `videos/<id>/credits.txt` và `npm run video` nhắc dán file này vào mô tả video. Danh sách đầy đủ: `assets/audio/CREDITS.md`.

## Thêm âm thanh vào thư viện

Mọi file được chuẩn hoá khi thêm: m4a 48 kHz stereo, cắt im lặng hai đầu, chỉnh độ to theo loại (nhạc −24 LUFS, ambience −34, stinger/sfx −20; ambience giữ tối đa 90 giây).

- **File có sẵn**: `npm run audio -- add <file> --kind music --mood calm,warm --energy 2 --license cc0 [--author … --url …]`.
  Bắt buộc có giấy phép (hoặc `--source`): `cc0`, `pdm`, `by`, `by-sa`, `pixabay`, `mixkit`, `yt`, `subscription`, `own` (của DSC), `lyria`. Không nhận NC/ND vì DSC dùng thương mại.
- **Tìm trên mạng (Openverse: Freesound, Jamendo, ccMixter…)**:
  `npm run audio -- search "rain" --kind ambience [--cc0]` rồi `npm run audio -- fetch <id> --kind ambience --mood rain,calm --id rain-soft`.
  Kết quả chỉ gồm giấy phép dùng thương mại được. `--cc0` lọc bỏ bài cần ghi công.
- **Lyria (trả phí)**: thêm mục vào `assets/audio/lyria-batch.json`, rồi `npm run audio -- generate`. Lệnh in ước tính (~0,06 USD/bài 30 giây) và dừng. Thêm `--api` để tạo thật. Bài trùng prompt + seed với `music.wav` mà một video đã tạo thì được lấy lại miễn phí.
- **Stinger tổng hợp**: thêm hàm vào `SOUNDS` trong `scripts/lib/sound.mjs`, khai báo trong lệnh `synth` của `scripts/audio.mjs`, rồi `npm run audio -- synth`.
- Xoá: `npm run audio -- remove <id>`.

## Nguồn YouTuber hay dùng

Xem nhanh: `npm run audio -- sources`. Tải tay từ web, rồi thêm cả thư mục một lần:
`npm run audio -- add ~/Downloads/pixabay/ --kind music --mood calm --source pixabay`. `--source` tự điền giấy phép.

| `--source` | Nguồn | Giấy phép / lưu ý |
| --- | --- | --- |
| `pixabay` | Pixabay Music + Sound Effects | Dùng thương mại, không cần ghi công. Bài có biểu tượng khiên là có Content ID: thêm `--contentid` và chụp màn hình trang giấy phép lúc tải. |
| `mixkit` | Mixkit | Dùng thương mại, không cần ghi công. |
| `incompetech` | Kevin MacLeod | CC BY, tự điền tác giả. Bắt buộc ghi công. |
| `yt` | YouTube Audio Library (YouTube Studio → Thư viện âm thanh) | Chắc chắn dùng được trên YouTube. Đăng nơi khác thì xem điều khoản từng bài. Bài ghi "attribution required" thì thêm `--credit --attribution "…"`. |
| `fma`, `freesound` | Free Music Archive, Freesound | Giấy phép khác nhau từng bài, nên bắt buộc có `--license`. NC/ND bị chặn. |
| `epidemic`, `artlist`, `envato` | Thư viện trả phí | Giấy phép gắn với thuê bao: chỉ dùng khi tài khoản DSC còn hạn lúc đăng video. |

Có thể tìm tự động mà không phải tải tay: `npm run audio -- search` (Openverse gom Freesound, Jamendo, ccMixter).

### TikTok

- **Commercial Music Library (CML)** của TikTok là kho nhạc dành cho tài khoản doanh nghiệp. Nhạc trong đó chỉ được cấp phép để dùng *trong* TikTok (chọn trong app hoặc TikTok Ads Manager), không tải về để trộn vào video của mình hay đăng lên YouTube. Vì vậy không đưa CML vào thư viện này.
- **Nhạc trend / "sound" phổ biến** là nhạc có bản quyền. Tài khoản doanh nghiệp như DSC không được dùng.
- Cách làm: đăng video với nhạc từ thư viện này (Pixabay, Mixkit, Lyria, CC0, …). Hoặc nếu muốn dùng nhạc CML, xuất bản không có nhạc nền rồi chọn nhạc CML ngay trong app TikTok lúc đăng.

## Mood đang dùng

Nhạc: upbeat, playful, curious, calm, lofi, warm, corporate, serious, documentary, history, tense, mystery, dramatic, hopeful, inspiring, happy, news, tech, reflective, ambient, kids.
Ambience: rain, nature, morning, market, crowd, city, traffic, street, office, work, typing, cafe.
Stinger: intro, outro, quiz, reveal, correct, emphasis, build.
SFX (`sfx-…`): whoosh, pop, click, ding, money/cash/coin, notification, typing, camera, applause, scratch, page, success, wrong, drumroll, clock. Nghe hết một lượt: `lab/out/audio-sampler-sfx.mp3` (tên theo thứ tự trong `.txt` cạnh đó).
Nhạc `km-…` là của Kevin MacLeod (CC BY, phải ghi công; tự sinh `credits.txt`).
Muốn thêm mood mới thì cứ đặt khi `add`/`fetch`, `list` sẽ hiện ra.
