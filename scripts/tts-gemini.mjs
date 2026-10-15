#!/usr/bin/env node
// Tạo giọng đọc bằng Gemini TTS (free tier) — một lần gọi API cho cả kịch bản,
// rồi tự cắt thành từng cảnh dựa vào khoảng lặng giữa các câu.
//
// Cách dùng:  node scripts/tts-gemini.mjs videos/t01-vi-mo-la-gi/script.json
// Cần:        GEMINI_API_KEY trong file .env (lấy miễn phí ở https://aistudio.google.com/apikey)
// Kết quả:    videos/<id>/voice.wav  +  videos/<id>/timings.json

import fs from "node:fs";
import path from "node:path";
import { videoDir } from "./lib/paths.mjs";
import { loadEnv } from "./lib/env.mjs";
import { pcmToWav } from "./lib/wav.mjs";
import { splitScenes } from "./lib/split.mjs";

loadEnv();
const contentPath = process.argv[2];
if (!contentPath) {
  console.error("Thiếu file kịch bản. Ví dụ: node scripts/tts-gemini.mjs videos/t01-vi-mo-la-gi/script.json");
  process.exit(1);
}
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Chưa có GEMINI_API_KEY. Copy .env.example thành .env rồi dán API key vào.");
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));
const model = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const voiceName = process.env.GEMINI_VOICE || content.voice?.voiceName || "Kore";
const style = content.voice?.style || "Read aloud in a clear Vietnamese voice.";
const outDir = videoDir(content.id);
fs.mkdirSync(outDir, { recursive: true });

// Mỗi cảnh một đoạn, ngăn bằng dòng trống để giọng đọc ngắt nghỉ rõ giữa các cảnh.
const transcript = content.scenes.map((s) => s.text.trim()).join("\n\n");
const prompt = `${style}\n\n${transcript}`;

async function callGemini(attempt = 1) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`Gemini trả lỗi ${res.status} sau ${attempt} lần thử: ${await res.text()}`);
    const wait = 15 * attempt;
    console.log(`Gemini báo ${res.status} (giới hạn free tier hoặc quá tải). Thử lại sau ${wait}s…`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return callGemini(attempt + 1);
  }
  if (!res.ok) throw new Error(`Gemini trả lỗi ${res.status}: ${await res.text()}`);
  return res.json();
}

console.log(`Đang tạo giọng đọc: model=${model}, voice=${voiceName}, ${content.scenes.length} cảnh…`);
const data = await callGemini();
const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
if (!part) throw new Error("Gemini không trả audio. Phản hồi: " + JSON.stringify(data).slice(0, 500));

const mime = part.inlineData.mimeType || "";
const audioBuf = Buffer.from(part.inlineData.data, "base64");
let wav;
if (/wav/i.test(mime) || audioBuf.subarray(0, 4).toString() === "RIFF") {
  wav = audioBuf; // một số model trả WAV hoàn chỉnh
} else {
  const rate = Number((mime.match(/rate=(\d+)/) || [])[1] || 24000);
  wav = pcmToWav(audioBuf, rate); // các model preview trả PCM 16-bit mono
}
const voicePath = path.join(outDir, "voice.wav");
fs.writeFileSync(voicePath, wav);

// Cắt cảnh theo khoảng lặng giữa các câu.
const split = splitScenes(wav, content.scenes);
const total = split.duration;
const timings = { source: "gemini", model, voice: voiceName, audio: "voice.wav", ...split };
fs.writeFileSync(path.join(outDir, "timings.json"), JSON.stringify(timings, null, 2));
console.log(`Xong: ${voicePath} (${total.toFixed(1)}s). Mốc từng cảnh lưu ở ${outDir}/timings.json`);
console.log("Nghe lại voice.wav trước khi dựng: kiểm tra phát âm số, thuật ngữ (P/E, EPS).");
