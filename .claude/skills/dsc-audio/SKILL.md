---
name: dsc-audio
description: Chọn và trộn âm thanh cho video DSC Academy — nhạc nền thư viện hoặc Lyria, ambience, stinger, bộ tiếng động, độ to LUFS, mix v2 (EQ khoét giọng, nén giọng, khoảng lặng hush), ghi công giấy phép. Dùng khi người dùng hỏi về nhạc, tiếng động, âm lượng, ducking hoặc thêm bài vào thư viện.
---

# Âm thanh

Đọc `docs/audio-guide.md` khi thêm bài, tìm trên mạng (Openverse) hoặc tạo lô Lyria. Thư viện `assets/audio/` (trong git): `npm run audio -- list`, nghe dưới giọng: `npm run audio -- try <bài> <video>`. Nguồn hay dùng: `npm run audio -- sources`; thêm: `npm run audio -- add <file|thư mục> --source …`.

## Trong `script.json`
- `music`: id, `{track, volume}`, `{mood, energy}` hoặc (essay/toon) `{prompt, negative, seed, volume}` cho Lyria — báo phí, chỉ gọi khi có `--api`.
- `ambience[]` {track, from, to}, `stingers` {intro, outro}, `stinger` trên cảnh, `sfxSet` (paper, playful, news, soft, none).
- Tiếng động được lọc tự động (`sfxBudget`, khoảng 30–45 tiếng/phút), mỗi lần phát lệch cao độ ±6% để không máy móc.
- `loudness`: mục tiêu LUFS (mặc định -16). YouTube chuẩn hoá về -14 và chỉ hạ chứ không tăng, nên bản YouTube đặt `-14`. True peak giữ ≤ -1,5 dBTP.
- `"mix": "v2"` (video mới nên bật): giọng lọc ù < 70 Hz, nén 2,5:1, khử xì; nhạc + ambience cắt trầm < 80 Hz (loa điện thoại), khoét -4 dB quanh 3 kHz chừa chỗ cho giọng; cảnh có `"hush": true` hạ nhạc còn 15% từ 0,4 giây trước cảnh tới hết cảnh (khoảng lặng trước câu chốt).
- Ducking: nhạc tự hạ khi có lời (`duck` {threshold, ratio, attack, release} để chỉnh).

## Nguyên tắc
- Giọng là nhân vật chính; nhạc nằm dưới giọng khoảng 18–24 LU. Riser trước lúc lật bài, stinger DSC cố định đầu/cuối (logo âm thanh).
- Không nhận nhạc NC/ND, không nhạc TikTok CML/nhạc trend. Bài cần ghi công sinh `videos/<id>/credits.txt` (tự gộp vào `<Tên> (mô tả).txt`).
- Người que bản cũ không tạo nhạc Lyria riêng (lint chặn); 12 tập vĩ mô đã giao chưa thêm nhạc khi người dùng chưa đồng ý.
