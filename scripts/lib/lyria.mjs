// Gọi Google Lyria (Vertex AI) để tạo một đoạn nhạc không lời ~30 giây. Trả về Buffer WAV.
import { gcpAccessToken, gcpProjectId } from "./gcp-auth.mjs";

export async function generateMusic(m) {
  const project = gcpProjectId();
  if (!project) throw new Error("Thiếu GCP_SA_KEY — không tạo được nhạc nền.");
  const loc = m.location || "us-central1";
  const url = `https://${loc}-aiplatform.googleapis.com/v1/projects/${project}/locations/${loc}/publishers/google/models/${m.model || "lyria-002"}:predict`;
  const body = { instances: [{ prompt: m.prompt, negative_prompt: m.negative || "vocals, singing, lyrics", seed: m.seed ?? 7 }], parameters: {} };
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${await gcpAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (res.ok) {
      const j = JSON.parse(txt);
      const b64 = j.predictions?.[0]?.bytesBase64Encoded || j.predictions?.[0]?.audioContent;
      if (!b64) throw new Error("Phản hồi Lyria không có audio: " + txt.slice(0, 300));
      return Buffer.from(b64, "base64");
    }
    lastErr = `${res.status} ${txt.slice(0, 400)}`;
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  throw new Error("Không tạo được nhạc nền: " + lastErr);
}
