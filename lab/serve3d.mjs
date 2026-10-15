#!/usr/bin/env node
// Máy chủ tĩnh nhỏ phục vụ thư mục gốc dự án (module ES không chạy được qua file://).
// Cách dùng:  node lab/serve3d.mjs [cổng]   rồi mở http://localhost:<cổng>/lab/build/<id>/video3d/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".otf": "font/otf", ".wav": "audio/wav", ".png": "image/png", ".jpg": "image/jpeg" };

export function serve(root = process.cwd(), port = 0) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end("not found");
    const stat = fs.statSync(file);
    const type = TYPES[path.extname(file)] || "application/octet-stream";
    // hỗ trợ Range để thẻ <audio> tua được
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range) {
      const start = Number(range[1] || 0), end = range[2] ? Number(range[2]) : stat.size - 1;
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () => r(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await serve(process.cwd(), Number(process.argv[2] || 5173));
  console.log(`Xem trước: http://localhost:${s.address().port}/lab/build/<id>/video3d/`);
}
