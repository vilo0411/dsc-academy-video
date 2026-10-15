// Thư viện âm thanh dùng chung: assets/audio/catalog.json + file m4a đã chuẩn hoá độ to.
// Kịch bản chọn nhạc nền / ambience / stinger bằng id hoặc theo mood (xem docs/audio-guide.md).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const AUDIO_DIR = "assets/audio";
export const CATALOG = path.join(AUDIO_DIR, "catalog.json");
export const KINDS = ["music", "ambience", "stinger", "sfx"];
// Độ to chuẩn khi thêm vào thư viện. Nhạc ≈ bản Lyria cũ (−24 LUFS) để "volume" mặc định 1,5 nghe như trước.
export const TARGET_LUFS = { music: -24, ambience: -34, stinger: -20, sfx: -20 };
// Giấy phép dùng được cho video thương mại (DSC): không NC, không ND.
export const LICENSES = {
  cc0: "CC0", pdm: "Public Domain", by: "CC BY", "by-sa": "CC BY-SA",
  pixabay: "Pixabay Content License", mixkit: "Mixkit License", yt: "YouTube Audio Library",
  subscription: "Thuê bao trả phí (Epidemic Sound, Artlist…)",
  lyria: "Tạo bằng Lyria (Google)", own: "Của DSC / tự làm", synth: "Tổng hợp bằng code",
};
// Nhận track hoặc mã giấy phép. Bài YouTube Audio Library có ghi "attribution required" thì add với --credit.
export const needsCredit = (t) => (typeof t === "string" ? t === "by" || t === "by-sa" : t.license === "by" || t.license === "by-sa" || !!t.credit);
// Lưu ý khi dùng: hiện trong lint + list.
export const licenseNote = (t) =>
  t.license === "yt" ? "YouTube Audio Library: chắc chắn dùng được trên YouTube; đăng nơi khác (TikTok, Facebook, web) cần xem điều khoản từng bài"
  : t.license === "subscription" ? `thuê bao${t.account ? ` ${t.account}` : ""}: chỉ hợp lệ khi video đăng lúc thuê bao còn hạn`
  : t.contentId ? "bài có đăng ký Content ID: YouTube có thể tự claim, giữ bằng chứng giấy phép để gỡ"
  : null;

export function loadCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  } catch {
    return { tracks: [] };
  }
}
export function saveCatalog(cat) {
  cat.tracks.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  fs.writeFileSync(CATALOG, JSON.stringify(cat, null, 2) + "\n");
}

export const trackFile = (t) => path.join(AUDIO_DIR, t.file);

export function findTrack(id, kind, cat = loadCatalog()) {
  const t = cat.tracks.find((x) => x.id === id);
  if (!t) throw new Error(`Không có "${id}" trong thư viện âm thanh (npm run audio -- list${kind ? ` --kind ${kind}` : ""})`);
  // Chỗ đặt stinger nhận cả tiếng động ngắn (sfx): ting, vỗ tay, máy tính tiền…
  if (kind && t.kind !== kind && !(kind === "stinger" && t.kind === "sfx")) throw new Error(`"${id}" là ${t.kind}, không phải ${kind}`);
  return t;
}

// Chọn theo mood/energy, ổn định theo seed (id video): dựng lại nhiều lần vẫn ra cùng một bài.
export function pickTrack({ kind = "music", mood, energy }, seed, cat = loadCatalog()) {
  const moods = [].concat(mood || []);
  let c = cat.tracks.filter((t) => t.kind === kind && (!moods.length || moods.some((m) => t.mood?.includes(m))));
  if (energy != null && c.length) {
    const best = Math.min(...c.map((t) => Math.abs((t.energy ?? 3) - energy)));
    c = c.filter((t) => Math.abs((t.energy ?? 3) - energy) === best);
  }
  if (!c.length) throw new Error(`Thư viện không có ${kind} nào hợp mood "${moods.join(", ")}"`);
  c.sort((a, b) => a.id.localeCompare(b.id));
  const h = crypto.createHash("sha1").update(String(seed)).digest().readUInt32BE(0);
  return c[h % c.length];
}

// Tham chiếu trong kịch bản: "id" | { track, volume } | { mood, energy, volume }
function ref(r, kind, seed, cat) {
  if (typeof r === "string") return { t: findTrack(r, kind, cat) };
  if (r?.track) return { t: findTrack(r.track, kind, cat), volume: r.volume };
  if (r?.mood || r?.energy != null) return { t: pickTrack({ kind, mood: r.mood, energy: r.energy }, seed, cat), volume: r.volume };
  return null;
}
export const usesLibraryMusic = (content) => typeof content.music === "string" || !!(content.music && !content.music.prompt && (content.music.track || content.music.mood || content.music.energy != null));

// Gom mọi âm thanh thư viện của một video theo mốc cảnh.
// timings.scenes: [{ id, start, end }]. Trả { music, musicVol?, beds[], hits[], used[] } — đường dẫn file đọc trực tiếp bằng ffmpeg.
export function resolveAudio(content, timings, total, dir) {
  const cat = loadCatalog();
  const used = [];
  const take = (x) => (x && used.push(x.t), x);
  const sc = timings.scenes || [];
  const sceneAt = (id, edge) => {
    const i = content.scenes.findIndex((s) => s.id === id);
    if (i < 0 || !sc[i]) throw new Error(`ambience/stinger: không có cảnh "${id}"`);
    return edge === "end" ? (sc[i + 1]?.start ?? total) : sc[i].start;
  };

  let music = null, musicVol;
  if (usesLibraryMusic(content)) {
    const m = take(ref(content.music, "music", content.id + ":music", cat));
    music = trackFile(m.t);
    musicVol = m.volume;
  } else if (dir && fs.existsSync(path.join(dir, "music.wav"))) music = path.join(dir, "music.wav");

  const beds = [].concat(content.ambience || []).map((a, k) => {
    const r = take(ref(a, "ambience", `${content.id}:amb${k}`, cat));
    const start = a.from ? sceneAt(a.from) : 0;
    const end = a.to ? sceneAt(a.to, "end") : total;
    return { file: trackFile(r.t), start, end, vol: r.volume ?? 1 };
  });

  const hits = [];
  const hit = (r, t, k) => {
    const x = take(ref(r, "stinger", `${content.id}:st${k}`, cat));
    if (x) hits.push({ file: trackFile(x.t), t: Math.max(0, t + (r.offset || 0)), vol: x.volume ?? 1 });
  };
  const st = content.stingers || {};
  if (st.intro) hit(st.intro, 0, "intro");
  if (st.outro) hit(st.outro, sc.at(-1)?.start ?? Math.max(0, total - 3), "outro");
  content.scenes.forEach((s, i) => {
    if (!s.stinger || !sc[i]) return;
    const at = typeof s.stinger === "object" && s.stinger.at != null ? s.stinger.at : 0;
    hit(s.stinger, sc[i].start + at * (sc[i].end - sc[i].start), s.id);
  });
  return { music, musicVol, beds, hits, used };
}

// Ghi công cho bài CC BY/BY-SA (dán vào mô tả video). Trả nội dung hoặc "" nếu không cần.
export function creditsText(used) {
  const seen = new Set();
  const lines = used.filter((t) => needsCredit(t) && !seen.has(t.id) && seen.add(t.id)).map(creditLine);
  return lines.length ? "Âm thanh:\n" + lines.map((l) => `- ${l}`).join("\n") + "\n" : "";
}
export const creditLine = (t) => t.attribution || `"${t.title || t.id}" – ${t.author || "?"} (${LICENSES[t.license] || t.license})${t.url ? ` ${t.url}` : ""}`;

// Ghi videos/<id>/credits.txt khi cần, xoá khi không còn cần.
export function writeCredits(dir, used) {
  const p = path.join(dir, "credits.txt");
  const txt = creditsText(used);
  if (txt) fs.writeFileSync(p, txt);
  else if (fs.existsSync(p)) fs.rmSync(p);
  return txt ? p : null;
}
