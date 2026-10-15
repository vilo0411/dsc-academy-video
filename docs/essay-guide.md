# Hướng dẫn viết video essay (phong cách cắt dán giấy)

Tài liệu cho `"format": "essay"` (dựng bằng `scripts/build-essay.mjs`). Phần cốt truyện, nhịp và máy quay rút ra từ thư viện nhịp của [vox-director](https://github.com/Alisa0808/vox-director) (`references/beat-layer.md`), đã chỉnh cho nội dung giáo dục đầu tư tiếng Việt.

## 1. Chọn kiểu cốt truyện (`arc`)

Ghi vào kịch bản: `"arc": "timeline"`.

| arc | Dùng khi | Khung nhịp |
|---|---|---|
| `timeline` | lịch sử, "từ đâu mà có" | mốc đầu → sự kiện → sự kiện → bước ngoặt → hiện tại → bài học |
| `hook_payoff` | một ý duy nhất (mặc định an toàn) | câu móc → bối cảnh → triển khai → vỡ lẽ → chốt |
| `myth_buster` | sửa một hiểu lầm phổ biến | sự thật trước → lầm tưởng → chỉ ra chỗ sai → nên hiểu thế nào |
| `how_it_works` | cơ chế, quy trình (lãi suất truyền dẫn, CPI đo thế nào) | câu móc → nó là gì → 2–3 bước → ý nghĩa với nhà đầu tư |
| `man_in_hole` | khủng hoảng và phục hồi (1997, 2008, 2011) | ổn → rơi → tệ hơn → leo lên → tốt hơn trước |
| `three_act` | câu chuyện 60–90 giây có xung đột | mở → căng dần → giải quyết |

Gợi ý: chủ đề lịch sử → `timeline`; khủng hoảng → `man_in_hole`; khái niệm hay bị hiểu sai → `myth_buster`; cơ chế → `how_it_works`.

## 2. Câu móc, nhịp và độ dài

- **Câu móc trong 3 giây đầu.** Cảnh 1 phải mang lời hứa của cả video: ngày tháng + địa điểm + một chi tiết lạ, một con số gây sốc, hoặc một câu hỏi. Không mở bằng phần giới thiệu.
  Kiểu câu móc: `surprising_stat` (con số), `direct_question` (câu hỏi), `pattern_interrupt` (chi tiết ngược đời, ví dụ "nhóm lò bằng tiền giấy"), `mistake_callout` ("bạn đang hiểu sai…").
- **Hình phải đổi ít nhất mỗi 3–5 giây.** Không cảnh nào đứng yên quá 5 giây: cảnh dài thì thêm `cuts` (cắt vào cận cảnh) hoặc thêm mảnh. Bản dựng tự kiểm tra và in cảnh báo `⚠ Nhịp` (xem `videos/<id>/.work/pacing.json`).
- **Tỷ lệ:** câu móc 1–3 giây → thân 70–80% → vỡ lẽ 10–20% → kết/CTA ≤ 5 giây.
- **Độ dài** (giọng Kore phong cách tài liệu đọc khoảng 3 âm tiết/giây, tính cả số đọc thành chữ):

  | Độ dài | Số cảnh | Mỗi cảnh | Âm tiết |
  |---|---|---|---|
  | 30–40 giây | 7–9 | 4–5 giây | 100–120 |
  | 60–90 giây | 13–17 | 4–6 giây | 200–260 |
  | 3 phút | 30–35 | 5–6 giây | 500–550 |

- **Kết:** `hard_cut` (cắt ngay sau câu chốt), `quick_cta` (mời đọc bài viết, ≤ 5 giây), `loop_close` (câu cuối gợi lại câu đầu). Câu chốt ngắn, ≤ 12 chữ, kết thúc bằng danh từ hoặc một khẳng định gọn.

## 3. Máy quay (`visual.camera`)

Chỉ dùng chuyển động phẳng (chữ luôn sắc, không méo):

| camera | Hiệu ứng | Dùng cho |
|---|---|---|
| `push_in` | đẩy vào chậm | căng thẳng, tập trung, con số sốc |
| `pull_out` | lùi ra | mở ra bức tranh lớn, bài học |
| `pan_left` / `pan_right` | trượt ngang | đi qua thời gian, đọc một dãy |
| `tilt_up` / `tilt_down` | trượt dọc | thang bậc, tăng/giảm |
| `parallax` | các lớp giấy trôi lệch tốc độ | cảnh nhiều lớp, "giấy sống" |
| `static` | gần như đứng yên | câu chốt, định nghĩa — sự đứng yên báo hiệu "đây là ý chính" |

- **Không hai cảnh liền nhau cùng một kiểu** (đổi luân phiên nhóm phóng ↔ trượt ↔ đứng yên). Bỏ trống `camera` thì bản dựng tự xoay vòng.
- Gợi ý theo arc: `timeline` → trượt cùng một hướng qua các mốc (xen `parallax`), `push_in` ở bước ngoặt, `pull_out` ở bài học, `static` ở định nghĩa và cảnh cuối.

## 4. Cắt vào cận cảnh (`visual.cuts`)

Một cảnh có thể có hai "khung": toàn cảnh để định hướng, rồi cắt thẳng vào chi tiết quan trọng — cách Vox giữ nhịp nhanh mà không cần thêm cảnh.

```json
"cuts": [{ "at": 0.55, "x": 1400, "y": 640, "zoom": 1.6 }]
```

`at` là thời điểm (0–1 trong phần lời), `x, y` là tâm chi tiết trên khung 1920×1080, `zoom` 1.4–1.8. Dùng cho cảnh dài hơn 6 giây hoặc khi lời nhắc tới một con số/chi tiết cụ thể.

## 5. Chuyển động bên trong khung

- Mỗi cảnh nên có nhiều thứ chuyển động: mảnh vào theo nhịp stop-motion, dây đỏ tự kéo, con dấu đập, bộ đếm chạy số.
- **Vật thể bay ngang khung** (`"kind": "fly"`, ví dụ đồng xu bay dọc dòng thời gian): là cú nhấn cho một nhịp then chốt, **không dùng ở mọi cảnh**.
  ```json
  { "kind": "fly", "name": "coin", "x": 0, "y": 0, "w": 150, "path": [[1500, 420], [300, 420]], "at": 0.3, "dur": 1.4, "spin": -360 }
  ```
- Luôn giữ chất "giấy cứng": trượt, rơi, lật, bay; không méo, không tan chảy.

## 6. Âm thanh

- `music.prompt`: mô tả nhạc không lời hợp tông (tài liệu, tò mò, nhịp đều). Nhạc tự hạ khi có lời, nằm dưới giọng khoảng 13 dB.
- `hit: true` trên mảnh quan trọng nhất của cảnh (năm, con số, thuật ngữ chính) — tối đa 3–4 lần mỗi video để còn sức nặng.

## 7. Quy tắc nội dung

Như mọi video DSC: không nêu mã cổ phiếu thật, không khuyến nghị, không dự báo; dữ kiện lịch sử phải có nguồn trong `sources`; không vẽ khuôn mặt người thật, trẻ em chỉ thể hiện bằng đồ vật.
