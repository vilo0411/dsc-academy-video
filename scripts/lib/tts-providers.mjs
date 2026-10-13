// Các nguồn giọng đọc. Mỗi hàm nhận một đoạn văn và trả về mẫu âm thanh mono (Float32) + sample rate.
//
// provider:
//   "gemini-api"   Gemini API qua AI Studio (GEMINI_API_KEY, free tier)
//   "cloud-gemini" Gemini-TTS qua Google Cloud Text-to-Speech (GCP_SA_KEY, trả phí theo token)
//   "cloud-chirp"  Chirp 3 HD qua Google Cloud Text-to-Speech (GCP_SA_KEY, miễn phí 1 triệu ký tự/tháng)

import { readWav } from "./wav.mjs";
import { gcpAccessToken, gcpProjectId } from "./gcp-auth.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label) {
  for (let attempt = 1; ; attempt++) {
    const res = await fn();
    if (res.ok) return res.json();
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      console.log(`${label}: lỗi ${res.status}, thử lại sau ${15 * attempt}s…`);
      await sleep(15000 * attempt);
      continue;
    }
    throw new Error(`${label}: lỗi ${res.status} ${body.slice(0, 600)}`);
  }
}

function pcm16ToFloat(buf) {
  const n = Math.floor(buf.length / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}

function decodeAudio(buf, mime = "") {
  if (buf.subarray(0, 4).toString() === "RIFF") {
    const { samples, sampleRate } = readWav(buf);
    return { samples, sampleRate };
  }
  const rate = Number((mime.match(/rate=(\d+)/) || [])[1] || 24000);
  return { samples: pcm16ToFloat(buf), sampleRate: rate };
}

async function geminiApi(text, v) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Thiếu GEMINI_API_KEY.");
  const model = v.model || "gemini-3.1-flash-tts-preview";
  const prompt = v.style ? `${v.style}\n\n${text}` : text;
  const j = await withRetry(
    () =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v.voice || "Kore" } } } },
        }),
      }),
    `Gemini API ${model}`
  );
  const part = j?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("Gemini API không trả audio: " + JSON.stringify(j).slice(0, 400));
  return decodeAudio(Buffer.from(part.inlineData.data, "base64"), part.inlineData.mimeType);
}

async function cloudTts(body, label) {
  const token = await gcpAccessToken();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const project = gcpProjectId();
  if (project) headers["x-goog-user-project"] = project;
  const j = await withRetry(
    () => fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers, body: JSON.stringify(body) }),
    label
  );
  if (!j.audioContent) throw new Error(`${label}: không có audioContent`);
  return decodeAudio(Buffer.from(j.audioContent, "base64"));
}

async function cloudGemini(text, v) {
  const model = v.model || "gemini-2.5-pro-tts";
  return cloudTts(
    {
      input: { text, ...(v.style ? { prompt: v.style } : {}) },
      voice: { languageCode: v.languageCode || "vi-VN", name: v.voice || "Kore", modelName: model },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000 },
    },
    `Cloud Gemini-TTS ${model}`
  );
}

async function cloudChirp(text, v) {
  const name = v.voice.includes("Chirp3") ? v.voice : `vi-VN-Chirp3-HD-${v.voice}`;
  return cloudTts(
    {
      input: { text },
      voice: { languageCode: v.languageCode || "vi-VN", name },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000, speakingRate: v.speakingRate || 1.0 },
    },
    `Chirp 3 HD ${name}`
  );
}

export async function synthesize(text, v) {
  switch (v.provider) {
    case "gemini-api":
      return geminiApi(text, v);
    case "cloud-gemini":
      return cloudGemini(text, v);
    case "cloud-chirp":
      return cloudChirp(text, v);
    default:
      throw new Error(`Không rõ provider giọng đọc: ${v.provider}`);
  }
}

// Đổi sample rate đơn giản (nội suy tuyến tính) để ghép các đoạn về cùng một tần số.
export function resample(samples, from, to) {
  if (from === to) return samples;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    out[i] = samples[i0] + (samples[i1] - samples[i0]) * (x - i0);
  }
  return out;
}

// Cắt khoảng lặng đầu/cuối để quãng nghỉ giữa các cảnh đều nhau.
export function trimSilence(samples, sampleRate, thr = 0.01) {
  const pad = Math.floor(0.04 * sampleRate);
  let a = 0;
  let b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  return samples.subarray(Math.max(0, a - pad), Math.min(samples.length, b + pad));
}

export function floatToWav(samples, sampleRate) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
