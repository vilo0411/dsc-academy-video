#!/usr/bin/env python3
# Tách nền ảnh nhân vật hoạt hình (viền đen, nền trơn một màu) bằng tô loang từ mép ảnh.
# Mô hình tách nền cho ảnh người thật để lại quầng xám giữa tay và thân; với tranh vẽ, tô loang sạch hơn:
# vùng gần màu nền nối ra mép ảnh → trong suốt; vùng nền bị bao kín nhưng lớn (khe giữa tay và thân) → trong suốt;
# viền giáp nền làm mờ dần theo khoảng cách màu (khử răng cưa).
#
# Cách dùng:  python3 scripts/lib/cutout.py vào.png ra.png [--tol 24] [--seal 2] [--single]
#   --seal N   bịt khe hở N px trên nét viền trước khi tô loang (áo trắng trên nền trắng không bị loang vào)
#   --single   ảnh có nhiều hình (toàn thân + bán thân): chỉ giữ hình toàn thân (đủ chân, cao nhất), cắt sát khung quanh nó
import sys
import numpy as np
from PIL import Image, ImageDraw

argv = sys.argv
src, dst = argv[1], argv[2]
opt = lambda k, d: float(argv[argv.index(k) + 1]) if k in argv else d
tol = opt("--tol", 24.0)
seal = int(opt("--seal", 0))
soft = tol * 2.6  # trên ngưỡng này là màu nhân vật, giữa hai ngưỡng thì làm mờ dần

im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32)
h, w, _ = a.shape
# Màu nền: trung vị các điểm dọc 4 mép ảnh
edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
bg = np.median(edge, axis=0)
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))


def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy * dy + dx * dx <= r * r:
                out |= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
    return out


bglike = dist < tol
if not seal and bg.min() > 245:
    seal = 2  # nền trắng: áo/da trắng dễ bị loang qua khe viền
if seal:
    # Nét viền (điểm tối) phình ra `seal` px làm hàng rào: khe hở nhỏ trên viền không còn đường cho tô loang lọt qua
    ink = a.mean(axis=2) < 110
    bglike &= ~dilate(ink, seal)

# Mặt nạ "giống nền" (255) rồi tô loang từ mép: vùng nối ra mép thành 128
mask = Image.fromarray(np.where(bglike, 255, 0).astype(np.uint8), "L").copy()  # .copy(): ảnh từ numpy chỉ đọc, tô loang không ghi được
for x in range(0, w, 6):
    for y in (0, h - 1):
        if mask.getpixel((x, y)) == 255:
            ImageDraw.floodfill(mask, (x, y), 128)
for y in range(0, h, 6):
    for x in (0, w - 1):
        if mask.getpixel((x, y)) == 255:
            ImageDraw.floodfill(mask, (x, y), 128)
m = np.asarray(mask).copy()

# Vùng nền bị bao kín: lớn hơn 0,15% ảnh thì cũng là nền (khe giữa tay và thân); nhỏ thì giữ (lòng trắng mắt, răng…)
# Khi đã bịt viền (--seal) thì thân áo trắng cũng là vùng kín lớn, nên không áp quy tắc này.
mimg = Image.fromarray(m, "L").copy()
if not seal:
    min_area = 0.0015 * w * h
    holes = np.argwhere(m == 255)
    for y, x in holes[:: max(1, len(holes) // 4000)]:
        if mimg.getpixel((int(x), int(y))) != 255:
            continue
        before = np.asarray(mimg) == 255
        ImageDraw.floodfill(mimg, (int(x), int(y)), 64)
        region = (np.asarray(mimg) == 64) & before
        mimg.paste(128 if region.sum() >= min_area else 200, mask=Image.fromarray((region * 255).astype(np.uint8), "L"))
m = np.asarray(mimg)

alpha = np.where(m == 128, 0.0, 1.0)
if seal:
    # Phần viền phình ra đã chặn tô loang: trả lại trong suốt cho điểm giống nền nằm sát vùng nền ngoài
    outside = alpha == 0
    alpha = np.where(dilate(outside, seal + 1) & (dist < tol), 0.0, alpha)
# Khử răng cưa: điểm sát nền (trong 2px) có màu lưng chừng giữa nền và nhân vật thì trong một phần
transparent = alpha == 0
edge_px = dilate(transparent, 2) & ~transparent
alpha = np.where(edge_px, np.clip((dist - tol) / (soft - tol), 0, 1), alpha)

if "--single" in argv:
    # Tách các hình rời nhau (theo vùng không trong suốt), giữ hình cao nhất và mảnh nhỏ nằm trong khung của nó
    solid = Image.fromarray(np.where(alpha > 0.5, 255, 0).astype(np.uint8), "L").copy()
    comps = []
    pts = np.argwhere(np.asarray(solid) == 255)
    for y, x in pts[:: max(1, len(pts) // 3000)]:
        if solid.getpixel((int(x), int(y))) != 255:
            continue
        ImageDraw.floodfill(solid, (int(x), int(y)), 100 + len(comps) % 150)
        reg = np.asarray(solid) == 100 + len(comps) % 150
        ys, xs = np.nonzero(reg)
        comps.append((ys.max() - ys.min(), (ys.min(), ys.max(), xs.min(), xs.max()), reg.copy()))
        solid.paste(10, mask=Image.fromarray((reg * 255).astype(np.uint8), "L"))
    # Ưu tiên hình đủ chân (không chạm mép dưới ảnh; hình bán thân thường bị cắt ở mép dưới), rồi tới hình cao nhất
    comps.sort(key=lambda c: (c[1][1] >= h - 4, -c[0]))
    y0, y1, x0, x1 = comps[0][1]
    keep = comps[0][2].copy()
    for _, (a0, a1, b0, b1), reg in comps[1:]:
        cy, cx = (a0 + a1) / 2, (b0 + b1) / 2
        if y0 <= cy <= y1 and x0 - 40 <= cx <= x1 + 40:  # tay, giọt mồ hôi… sát hình chính
            keep |= reg
            y0, y1, x0, x1 = min(y0, a0), max(y1, a1), min(x0, b0), max(x1, b1)
    alpha = np.where(dilate(keep, 3), alpha, 0)
    pad = 24
    box = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
else:
    box = (0, 0, w, h)

out = np.dstack([a, alpha * 255]).astype(np.uint8)
res = Image.fromarray(out, "RGBA").crop(box)
if "--single" in argv:
    # đặt vào khung vuông, chân chạm đáy (để mọi tư thế cùng một mốc đặt chân)
    s = max(res.width, res.height)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(res, ((s - res.width) // 2, s - res.height))
    res = sq
res.save(dst, optimize=True)
print(f"{dst}: nền {bg.round().astype(int).tolist()}, {res.width}x{res.height}")
