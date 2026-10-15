// Sinh trang HTML cho một video 3D. Trang được phục vụ từ thư mục gốc dự án (lab/serve3d.mjs),
// nên đường dẫn module là tuyệt đối tính từ gốc: /lab/three/..., /node_modules/three/...
export function page3d({ title, entry, data, width = 1920, height = 1080 }) {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @font-face { font-family: Inter; src: url(/assets/fonts/Inter-Regular.otf); font-weight: 400; }
  @font-face { font-family: Inter; src: url(/assets/fonts/Inter-SemiBold.otf); font-weight: 600; }
  @font-face { font-family: Inter; src: url(/assets/fonts/Inter-ExtraBold.otf); font-weight: 800; }
  html, body { margin: 0; background: #0B1237; overflow: hidden; font-family: Inter, sans-serif; }
  #stage { position: relative; width: ${width}px; height: ${height}px; transform-origin: 0 0; overflow: hidden; }
  #stage canvas { display: block; }
  #overlay { position: absolute; inset: 0; pointer-events: none; }
  #controls { position: fixed; left: 0; right: 0; bottom: 0; height: 48px; display: flex; gap: 12px; align-items: center; padding: 0 16px; background: #0B1237; color: #fff; }
  #controls input { flex: 1; }
  #controls button { width: 44px; height: 32px; }
</style>
<script type="importmap">
{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/" } }
</script>
</head>
<body>
<div id="stage"><div id="overlay"></div></div>
<script>window.VIDEO = ${JSON.stringify(data)};</script>
<script type="module" src="${entry}"></script>
<!-- ép tải cả 3 độ đậm font trước khi vẽ chữ lên canvas -->
<div style="position:absolute;left:-9999px;font-family:Inter"><b style="font-weight:800">Ấ</b><i style="font-weight:600;font-style:normal">Ấ</i><span>Ấ</span></div>
</body>
</html>
`;
}
