// Chia lời thoại thành các đoạn phụ đề ngắn — dùng chung cho bản 2D (build.mjs) và bản 3D (build3d.mjs).

export function chunkCaption(text, maxChars) {
  const words = text.split(/\s+/);
  const chunks = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      chunks.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
    // ngắt sau dấu câu nếu đoạn đã đủ dài
    if (/[,.?!:]$/.test(w) && cur.length > maxChars * 0.55) {
      chunks.push(cur);
      cur = "";
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Mốc thời gian của từng đoạn phụ đề trong một cảnh: chia theo số ký tự trong khoảng thời gian đọc.
export function timeCaptions(text, start, end, maxChars) {
  const chunks = chunkCaption(text, maxChars);
  const speechDur = end - start - 0.25;
  const totalChars = chunks.reduce((s, c) => s + c.length, 0);
  let ct = start;
  return chunks.map((c, k) => {
    const cd = Math.max(0.6, (c.length / totalChars) * speechDur);
    const item = { text: c, start: ct, end: k === chunks.length - 1 ? end : ct + cd };
    ct += cd;
    return item;
  });
}
