#!/usr/bin/env node
// Kiểm tra kịch bản trước khi tốn lượt giọng đọc/render: kiểu cảnh, trường bắt buộc, độ dài, quy tắc nội dung.
//
// Cách dùng:  npm run lint -- t01        (hoặc tên đầy đủ / đường dẫn videos/<id>/script.json; "all" = mọi video)
import fs from "node:fs";
import path from "node:path";
import { resolveVideo, allVideos, kindOf, videoDir } from "./lib/paths.mjs";
import { COMPANIES } from "./lib/series.mjs";
import { loadCatalog, needsCredit, usesLibraryMusic, licenseNote } from "./lib/audio-lib.mjs";
import { SFX_SETS, SOUND_KINDS } from "./lib/sound.mjs";
import { CUES, PRESETS, SFX_ALIAS, ICONS } from "./lib/shorts-style.mjs";

import { PRESET_TYPES as SERIES_TYPES } from "./lib/toon-presets.mjs";
const TRANS = new Set(["whip", "zoom", "zoomOut", "slice", "iris", "wipe", "slam", "cut"]);
const POSES = new Set(["idle", "point", "pointUp", "present", "wave", "cheer", "think", "shrug", "hips", "headHold", "facepalm"]);
const EXPRS = new Set(["happy", "excited", "surprised", "worried", "sad", "thinking", "confused", "confident", "neutral"]);
const EMOTES = new Set(["question", "exclaim", "bulb", "sweat", "sparkle"]);
const CAMERAS = new Set(["push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "parallax", "static"]);
const REQUIRED = { title: ["headline"], checklist: ["headline", "items"], quiz: ["question", "options"], tide: ["headline", "sub"], versus: ["left", "right"], pair: ["items"], notebook: ["entries"], outro: ["disclaimer"] };
// Cụm từ vi phạm quy tắc nội dung (khuyến nghị, cam kết, dự báo giá).
const BANNED = [/nên mua/i, /khuyến nghị mua/i, /khuyến nghị bán/i, /bán ngay/i, /mua ngay/i, /chắc chắn (lãi|có lời|tăng)/i, /cam kết lợi nhuận/i, /đảm bảo lợi nhuận/i];
// Có thể là dự báo giá — chỉ cảnh báo để đọc lại (nguyên lý kinh tế như "tiền pha loãng thì giá sẽ tăng" vẫn được).
const CHECK = [/giá (cổ phiếu|chứng khoán)?\s*sẽ (tăng|giảm|lên|xuống)/i];

export function lintScript(content) {
  const errors = [];
  const warns = [];
  const kind = kindOf(content);
  const scenes = content.scenes || [];
  if (!content.id) errors.push("thiếu id");
  if (!scenes.length) errors.push("không có cảnh nào");
  const syllables = scenes.reduce((n, s) => n + (s.text || "").split(/\s+/).filter(Boolean).length, 0);
  const all = scenes.map((s) => s.text || "").join(" ") + " " + JSON.stringify(scenes.map((s) => s.visual));
  if (kind === "unsupported") errors.push(`format "${content.format}" chưa có bộ dựng — dùng shorts-kinetic, series, essay, toon hoặc story`);
  // Chữ trên hình và ảnh bìa cũng phải theo quy tắc nội dung
  const onScreen = JSON.stringify([scenes.map((s) => s.visual), content.thumbnails || []]);
  for (const re of BANNED) if (re.test(onScreen)) warns.push(`chữ trên hình/ảnh bìa: đọc lại quy tắc nội dung (${re.source})`);
  let samePose = 0;
  scenes.forEach((s, i) => {
    const at = `cảnh ${i + 1}${s.id ? ` (${s.id})` : ""}`;
    const v = s.visual || {};
    if (!s.text?.trim() && kind !== "story") warns.push(`${at}: không có lời`);
    // Chữ số đứng riêng ("50", "3,5%"); tên chỉ số như M2, Q3 thì được.
    const num = (s.text || "").match(/(?<![A-Za-zÀ-ỹ])\d[\d.,%]*/);
    if (num && kind !== "story") errors.push(`${at}: có chữ số trong text — viết theo cách đọc ("${num[0]}")`);
    for (const re of BANNED) if (re.test(s.text || "")) errors.push(`${at}: vi phạm quy tắc nội dung (${re.source})`);
    for (const re of CHECK) if (re.test(s.text || "")) warns.push(`${at}: đọc lại — có phải dự báo giá? ("${s.text.match(re)[0]}")`);
    // Cảnh người que: chuỗi cũ (series) hoặc cảnh dựng sẵn trong toon (visual.type)
    const preset = kind === "toon" && v.type != null;
    if (kind === "series" || preset) {
      if (!SERIES_TYPES.has(v.type)) errors.push(`${at}: kiểu cảnh "${v.type}" không có`);
      if (preset) {
        if (v.trans && !TRANS.has(v.trans)) errors.push(`${at}: trans "${v.trans}" không có (${[...TRANS].join(", ")})`);
        const words = new Set((s.text || "").split(/\s+/).map((w) => w.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "")));
        const need = (w, f) => w && !words.has(w.toLowerCase().normalize("NFC")) && errors.push(`${at}: ${f} "${w}" không có trong lời của cảnh`);
        (v.beats || []).forEach((w, k) => need(w, `beats[${k}]`));
        need(typeof v.punch === "string" ? v.punch : v.punch?.at, "punch");
        need(typeof v.shake === "string" ? v.shake : null, "shake");
        need(v.gag?.at, "gag.at");
      }
      for (const f of REQUIRED[v.type] || []) if (v[f] == null) errors.push(`${at}: ${v.type} thiếu "${f}"`);
      if (v.type === "quiz" && v.options?.length !== 3) errors.push(`${at}: quiz cần đúng 3 lựa chọn`);
      if (v.type === "cycle" && v.active != null && ![0, 1, 2, 3].includes(v.active)) errors.push(`${at}: cycle.active là số pha 0–3 (phục hồi, tăng trưởng, đỉnh, suy thoái), không phải "${v.active}"`);
      if (v.pose && !POSES.has(v.pose)) errors.push(`${at}: pose "${v.pose}" không có`);
      const expr = v.type === "calc" ? v.face : v.expr;
      if (expr && !EXPRS.has(expr)) errors.push(`${at}: biểu cảm "${expr}" không có${v.type === "calc" ? " (cảnh calc dùng visual.face)" : ""}`);
      if (v.emote && !EMOTES.has(v.emote)) errors.push(`${at}: emote "${v.emote}" không có`);
      samePose = i && v.pose && v.pose === scenes[i - 1].visual?.pose ? samePose + 1 : 0;
      if (samePose === 3) warns.push(`${at}: tư thế "${v.pose}" lặp quá 3 cảnh liền`);
    }
    if (kind === "essay") {
      if (v.camera && !CAMERAS.has(v.camera)) errors.push(`${at}: camera "${v.camera}" không có`);
      if (i && v.camera && v.camera === scenes[i - 1].visual?.camera) warns.push(`${at}: camera "${v.camera}" trùng cảnh trước`);
    }
  });
  if (kind === "series" || (kind === "toon" && content.series && scenes.some((s) => s.visual?.type))) {
    const last = scenes.at(-1)?.visual;
    if (last?.type !== "outro") errors.push("cảnh cuối phải là outro");
    if (syllables < 600 || syllables > 750) warns.push(`${syllables} âm tiết (nên 600–750 cho 3–4 phút)`);
    if (scenes.length < 20 || scenes.length > 30) warns.push(`${scenes.length} cảnh (nên 20–30)`);
    const usesCompany = Object.values(COMPANIES).some((c) => all.includes(c.name.split(" ").slice(-2).join(" ")));
    if (usesCompany && !/giả định/.test(last?.disclaimer || "")) errors.push('dùng doanh nghiệp giả định nhưng disclaimer không có chữ "giả định"');
    if (!/(bài viết|bên dưới)/i.test(scenes.slice(-3).map((s) => s.text).join(" "))) warns.push("CTA cuối chưa mời đọc bài viết bên dưới video");
  }
  if (kind === "shorts") lintShorts(content, scenes, syllables, errors, warns);
  if ((kind === "essay" || kind === "toon") && !content.sources?.length) warns.push(`${kind} chưa có sources`);
  if (kind === "toon" && content.id && scenes.some((s) => !s.visual?.type) && !fs.existsSync(path.join(videoDir(content.id), "scenes.mjs")))
    errors.push("toon: cảnh không có visual.type cần hình trong scenes.mjs (hoặc dùng cảnh dựng sẵn: visual.type)");
  const gags = scenes.filter((s) => s.visual?.gag).length;
  if (kind === "toon" && gags > 3) warns.push(`${gags} gag — sổ tay khuyên 2–3 mỗi video`);
  if (content.mix && content.mix !== "v2") errors.push(`mix "${content.mix}" không có (chỉ "v2")`);
  if (content.loudness != null && (content.loudness > -9 || content.loudness < -24)) errors.push(`loudness ${content.loudness} LUFS bất thường (YouTube -14, mặc định -16)`);
  lintAudio(content, kind, scenes, errors, warns);
  return { kind, errors, warns, syllables, scenes: scenes.length };
}

// Video ngắn 9:16: cue hợp lệ, câu móc ≤ 3 giây, 30–60 giây, cảnh cuối outro_cta, chữ vừa vùng an toàn, 3 ảnh bìa.
function lintShorts(content, scenes, syllables, errors, warns) {
  if (content.preset && !PRESETS[content.preset]) errors.push(`preset "${content.preset}" không có (${Object.keys(PRESETS).join(", ")})`);
  const len = (x) => [...String(x ?? "")].length;
  const tooLong = (where, x, max) => len(x) > max && warns.push(`${where}: "${String(x).slice(0, 40)}…" dài ${len(x)} ký tự (≤ ${max} để không tràn vùng an toàn)`);
  scenes.forEach((s, i) => {
    const at = `cảnh ${i + 1}${s.id ? ` (${s.id})` : ""}`;
    const v = s.visual || {};
    const cue = v.cue || "statement";
    if (!CUES[cue]) return errors.push(`${at}: cue "${cue}" không có (${Object.keys(CUES).join(", ")})`);
    for (const f of CUES[cue]) if (v[f] == null) errors.push(`${at}: ${cue} thiếu "${f}"`);
    if (v.sfx && !SFX_ALIAS[v.sfx] && !SOUND_KINDS.includes(v.sfx)) errors.push(`${at}: sfx "${v.sfx}" không có (${Object.keys(SFX_ALIAS).join(", ")})`);
    if (v.icon && !ICONS[v.icon]) errors.push(`${at}: icon "${v.icon}" không có (${Object.keys(ICONS).join(", ")})`);
    if (v.emoji) warns.push(`${at}: emoji không hiện trên máy dựng GitHub — dùng "icon"`);
    if (v.mark && !String(v.tier2 ?? v.text ?? "").includes(v.mark)) errors.push(`${at}: mark "${v.mark}" không nằm trong chữ của cảnh`);
    if (cue === "hook_2tier") tooLong(at, v.tier2, 34);
    if (cue === "statement") {
      if (v.style && !["slide", "type", "glow", "blur", "hand"].includes(v.style)) errors.push(`${at}: style "${v.style}" không có (slide, type, glow, blur, hand)`);
      tooLong(at, v.text, v.style === "type" || v.style === "blur" ? 90 : 40);
    }
    if (v.markStyle && !["wave", "highlight"].includes(v.markStyle)) errors.push(`${at}: markStyle "${v.markStyle}" không có (wave, highlight)`);
    if (cue === "chapter") tooLong(at, v.title, 22);
    if (cue === "big_counter") tooLong(at, v.value, 9);
    if (cue === "list" || cue === "steps") {
      if (v.items?.length > 5) warns.push(`${at}: ${v.items.length} mục — tối đa 5 cho vừa khung dọc`);
      (v.items || []).forEach((x) => tooLong(at, typeof x === "string" ? x : x.title, 28));
    }
    if (cue === "ab_compare") [v.left, v.right].forEach((x) => x && tooLong(at, x.title, 14));
    const n = (s.text || "").split(/\s+/).filter(Boolean).length;
    if (n > 24) warns.push(`${at}: ${n} âm tiết (> 6 giây) — tách cảnh để hình đổi mỗi 2–4 giây`);
  });
  const first = scenes[0];
  if (first?.visual?.cue !== "hook_2tier") warns.push("cảnh đầu nên là hook_2tier (câu móc 2 tầng)");
  if (first && first.text.split(/\s+/).length > 14) warns.push(`câu móc ${first.text.split(/\s+/).length} âm tiết — nên ≤ 14 (≈ 3 giây)`);
  const last = scenes.at(-1)?.visual;
  if (last?.cue !== "outro_cta") errors.push("cảnh cuối phải là outro_cta (có disclaimer)");
  const [lo, hi] = content.format === "shorts-micro" ? [50, 130] : [100, 260];
  if (syllables < lo || syllables > hi) warns.push(`${syllables} âm tiết (nên ${lo}–${hi}${content.format === "shorts-micro" ? ", 15–30 giây" : ", 25–60 giây"})`);
  const th = content.thumbnails || [];
  if (th.length !== 3) warns.push(`thumbnails: ${th.length} phương án (nên 3: question, number, compare)`);
  th.forEach((t, k) => {
    if (!["question", "number", "compare"].includes(t.type)) errors.push(`thumbnails[${k}]: type "${t.type}" không có (question, number, compare)`);
    if (len(t.title) > 22) warns.push(`thumbnails[${k}]: tiêu đề ${len(t.title)} ký tự — chữ lớn chỉ vừa ≤ 22, đưa phần còn lại vào "kicker"`);
    if (len(t.kicker) > 34) warns.push(`thumbnails[${k}]: kicker ${len(t.kicker)} ký tự — ≤ 34`);
  });
}

// Âm thanh thư viện: id có trong assets/audio/catalog.json, đúng loại, mood có bài, cảnh from/to có thật.
function lintAudio(content, kind, scenes, errors, warns) {
  const cat = loadCatalog();
  const ids = new Set(scenes.map((s) => s.id));
  const check = (r, k, where) => {
    if (!r) return;
    if (typeof r === "string" || r.track) {
      const id = typeof r === "string" ? r : r.track;
      const t = cat.tracks.find((x) => x.id === id);
      if (!t) return errors.push(`${where}: "${id}" không có trong thư viện (npm run audio -- list --kind ${k})`);
      if (t.kind !== k && !(k === "stinger" && t.kind === "sfx")) return errors.push(`${where}: "${id}" là ${t.kind}, không phải ${k}`);
      if (licenseNote(t)) warns.push(`${where}: "${id}" — ${licenseNote(t)}`);
      if (needsCredit(t)) warns.push(`${where}: "${id}" (${t.license}) cần ghi công — dán videos/<id>/credits.txt vào mô tả video`);
    } else if (r.mood || r.energy != null) {
      const moods = [].concat(r.mood || []);
      const hit = cat.tracks.filter((t) => t.kind === k && (!moods.length || moods.some((m) => t.mood?.includes(m))));
      if (!hit.length) errors.push(`${where}: thư viện không có ${k} nào mood "${moods.join(", ")}"`);
    } else if (!(k === "music" && r.prompt)) errors.push(`${where}: cần id, { track }, { mood } hoặc { prompt }`);
  };
  if (content.music) {
    check(content.music, "music", "music");
    if (!usesLibraryMusic(content) && kind === "series") errors.push('music: người que không tạo nhạc Lyria riêng — dùng id hoặc { mood } trong thư viện');
  }
  [].concat(content.ambience || []).forEach((a, i) => {
    check(a, "ambience", `ambience[${i}]`);
    for (const e of ["from", "to"]) if (a?.[e] && !ids.has(a[e])) errors.push(`ambience[${i}].${e}: không có cảnh "${a[e]}"`);
  });
  for (const [k, r] of Object.entries(content.stingers || {})) {
    if (!["intro", "outro"].includes(k)) errors.push(`stingers.${k}: chỉ có intro, outro (stinger giữa video đặt "stinger" trên cảnh)`);
    check(r, "stinger", `stingers.${k}`);
  }
  scenes.forEach((s, i) => s.stinger && check(s.stinger, "stinger", `cảnh ${i + 1} (${s.id}) stinger`));
  if (content.sfxSet && !(content.sfxSet in SFX_SETS)) errors.push(`sfxSet "${content.sfxSet}" không có (${Object.keys(SFX_SETS).join(", ")})`);
}

export function printLint(id, r) {
  const head = `${id}: ${r.kind}, ${r.scenes} cảnh, ${r.syllables} âm tiết`;
  console.log(r.errors.length ? `✗ ${head}` : `✓ ${head}`);
  for (const e of r.errors) console.log(`  ✗ ${e}`);
  for (const w of r.warns) console.log(`  ⚠ ${w}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  const list = arg === "all" ? allVideos().map((v) => resolveVideo(v.script)) : [resolveVideo(arg)];
  let bad = 0;
  for (const v of list) {
    const r = lintScript(v.content);
    printLint(v.id, r);
    if (r.errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
