// Bản sửa tay trong HyperFrames Studio: videos/<id>/edit/ (bản 9:16: edit-9x16/), lưu trong git.
// Khi có bản sửa, bước dựng giữ index.html đã sửa thay vì ghi đè bằng bản sinh từ kịch bản.
// .base.json ghi mã băm của bản sinh lúc khoá; nếu kịch bản hoặc hệ thống dựng đổi sau đó thì cảnh báo.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { videoDir, workDir } from "./paths.mjs";

// File do bước dựng sinh lại mỗi lần: không lưu vào edit/.
export const GENERATED = (name) => ["index.html", "hyperframes.json", "meta.json"].includes(name) || name.startsWith(".") || ["fonts", "vendor", "media"].includes(name) || name.endsWith(".wav");

export const editsDir = (id, orientation = "16x9") => path.join(videoDir(id), orientation === "16x9" ? "edit" : `edit-${orientation}`);
// Bản sinh từ kịch bản: videos/<id>/.work/generated-16x9.html
export const generatedPath = (id, orientation = "16x9") => path.join(workDir(videoDir(id)), `generated-${orientation}.html`);
export const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// Gọi thay cho fs.writeFileSync(dir/index.html, html). Trả về true nếu dùng bản sửa tay.
export function writeIndex(id, orientation, dir, html) {
  const src = editsDir(id, orientation);
  const edited = path.join(src, "index.html");
  // Ứng dụng HyperFrames desktop chỉ mở thư mục có hyperframes.json/meta.json (như dự án tạo bằng hyperframes init).
  fs.writeFileSync(path.join(dir, "hyperframes.json"), JSON.stringify({ $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", paths: { assets: "assets" } }, null, 2) + "\n");
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) fs.writeFileSync(metaPath, JSON.stringify({ id: `${id}-${orientation}`, name: `${id} (${orientation})`, createdAt: new Date().toISOString() }, null, 2) + "\n");
  // Luôn giữ bản sinh từ kịch bản (ngoài thư mục dự án HyperFrames) để so sánh và để khoá/bỏ bản sửa.
  fs.writeFileSync(generatedPath(id, orientation), html);
  if (!fs.existsSync(edited)) {
    fs.writeFileSync(path.join(dir, "index.html"), html);
    return false;
  }
  fs.cpSync(src, dir, { recursive: true, filter: (f) => path.basename(f) !== ".base.json" });
  let base = null;
  try {
    base = JSON.parse(fs.readFileSync(path.join(src, ".base.json"), "utf8")).hash;
  } catch {}
  console.log(`✎ Dùng bản sửa tay ${edited}`);
  if (base !== sha1(html)) {
    console.log(
      `⚠ Bản sửa: kịch bản hoặc hệ thống dựng đã đổi sau khi khoá ${edited} — video vẫn dùng bản sửa cũ (lời đọc/thời lượng có thể lệch).` +
        ` Sửa lại rồi "npm run edit -- save", hoặc "npm run edit -- drop" để quay về bản sinh tự động.`
    );
  }
  return true;
}
