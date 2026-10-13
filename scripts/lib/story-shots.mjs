// Câu lệnh tạo hình cho phim kể chuyện, dùng chung cho SHOTLIST.md (làm tay), story-images.mjs (gọi API)
// và story-import.mjs (nhận file tải về).

export function shots(story) {
  const chars = story.characters || {};
  const places = story.places || {};
  const ratio = story.aspect || "16:9";

  const castLine = (cast) =>
    cast
      .map((k) => chars[k])
      .filter(Boolean)
      .map((c) => `${c.name} (${c.look})`)
      .join("; ");
  const refs = (cast = []) => cast.filter((k) => chars[k]).map((k) => `char-${k}.png`);

  const characterPrompt = (c) =>
    `Character reference sheet of ${c.name}: ${c.look}. Show the same character three times side by side: front view, three-quarter view, side view, full body, neutral pose, plain light background. Style: ${story.style}. Aspect ratio 16:9.`;

  const framePrompt = (shot) => {
    const cast = shot.cast || [];
    const parts = [];
    if (cast.length) parts.push(`Using the attached reference image(s), keep the characters exactly consistent: ${castLine(cast)}.`);
    parts.push(`Scene: ${shot.prompt}.`);
    if (shot.place && places[shot.place]) parts.push(`Setting: ${places[shot.place]}.`);
    parts.push(`Style: ${story.style}.`);
    parts.push(
      `Aspect ratio ${ratio}, full-bleed illustration filling the whole frame edge to edge, no borders, no letterbox bars, no blank bands; keep the lower third visually simple (floor, table top or ground) so subtitles stay readable.`
    );
    return parts.join(" ");
  };

  const videoPrompt = (shot) => {
    const cast = shot.cast || [];
    return [
      `${shot.prompt}.`,
      cast.length ? `Characters: ${castLine(cast)}.` : "",
      `Camera and motion: ${shot.motion || "subtle natural movement"}.`,
      `Style: ${story.style}.`,
      "8 seconds, ambient sound only, no speech, no music, no text on screen.",
    ]
      .filter(Boolean)
      .join(" ");
  };

  // Mọi ảnh cần có, theo thứ tự làm: nhân vật trước (để làm ảnh tham chiếu), rồi khung hình từng cảnh.
  const images = [
    ...Object.entries(chars).map(([key, c]) => ({ file: `char-${key}.png`, label: c.name, prompt: characterPrompt(c), refs: [] })),
    ...story.scenes.map((s) => ({ file: `${s.id}.png`, label: s.id, prompt: framePrompt(s.shot), refs: refs(s.shot.cast) })),
  ];
  const videos = story.scenes
    .filter((s) => s.shot.mode === "video")
    .map((s) => ({ file: `${s.id}.mp4`, label: s.id, prompt: videoPrompt(s.shot), first: `${s.id}.png` }));

  return { images, videos, refs, characterPrompt, framePrompt, videoPrompt };
}
