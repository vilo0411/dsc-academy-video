// Kiểu cảnh bổ sung cho Tập 2–12: biểu đồ đường, đồng hồ chu kỳ, kim chỉ số, phép cộng khối, bảng,
// chuỗi bước, cái cân, bập bênh, bể tiền, thanh trượt, lưới thẻ, chip, lịch.
// Panel nội dung rộng 1180px, cao 740px (bản 16:9).

const COLORS = (A) => ({ accent: A.accentDark, ink: A.ink, down: A.down, warn: "#D9A21B", muted: A.muted, blue: "#3B82C4" });
const PHASES = [
  { name: "Phục hồi", sectors: "Ngân hàng, chứng khoán, bất động sản" },
  { name: "Tăng trưởng", sectors: "Bán lẻ, tiêu dùng, công nghiệp" },
  { name: "Đỉnh", sectors: "Năng lượng, nguyên vật liệu" },
  { name: "Suy thoái", sectors: "Điện, nước, thiết yếu, y tế" },
];

export function extraScene(v, id, ctx) {
  const { inn, pop, steps, esc, f, A } = ctx;
  const C = COLORS(A);
  const head = v.headline ? `<h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>` : "";
  const headJs = (t) => (v.headline ? [pop(`#${id}-h`, t + 0.1)] : []);
  const subHtml = v.sub ? `<p class="sub" id="${id}-s">${esc(v.sub)}</p>` : "";
  const subJs = (t, d) => (v.sub ? [inn(`#${id}-s`, t + d * 0.55)] : []);

  switch (v.type) {
    // ---------- Biểu đồ đường ----------
    // series[{name, points[], color, dashed}], xLabels[], yMin, yMax, threshold{value,label}, band{lo,hi,label}, valueLabels
    case "line": {
      const W = 1000, H = 440, L = 70, R = 70, T = 30, B = 60;
      const n = Math.max(...v.series.map((s) => s.points.length));
      const yMin = v.yMin ?? Math.min(...v.series.flatMap((s) => s.points)) - 1;
      const yMax = v.yMax ?? Math.max(...v.series.flatMap((s) => s.points)) + 1;
      const X = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1);
      const Y = (y) => T + ((yMax - y) * (H - T - B)) / (yMax - yMin);
      let svg = `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="${A.line}" stroke-width="4"/>`;
      if (v.band) svg += `<rect id="${id}-band" x="${L}" y="${Y(v.band.hi)}" width="${W - L - R}" height="${Y(v.band.lo) - Y(v.band.hi)}" fill="${A.accentSoft}" stroke="${A.accentDark}" stroke-width="3" stroke-dasharray="10 8"/><text x="${W - R - 10}" y="${Y(v.band.hi) - 10}" text-anchor="end" font-size="24" font-weight="700" fill="${A.accentDark}">${esc(v.band.label || "")}</text>`;
      if (v.threshold) svg += `<g id="${id}-thr"><line x1="${L}" y1="${Y(v.threshold.value)}" x2="${W - R}" y2="${Y(v.threshold.value)}" stroke="${A.muted}" stroke-width="3" stroke-dasharray="12 10"/><text x="${L + 8}" y="${Y(v.threshold.value) - 12}" font-size="26" font-weight="700" fill="${A.muted}">${esc(v.threshold.label || String(v.threshold.value))}</text></g>`;
      (v.xLabels || []).forEach((lab, i) => (svg += `<text x="${X(i)}" y="${H - B + 40}" text-anchor="middle" font-size="24" fill="${A.muted}">${esc(lab)}</text>`));
      v.series.forEach((s, si) => {
        const pts = s.points.map((y, i) => [X(i), Y(y)]);
        const len = pts.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
        const col = C[s.color || (si === 0 ? "accent" : si === 1 ? "ink" : "warn")];
        svg += `<path id="${id}-p${si}" d="${pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${len.toFixed(0)}" stroke-dashoffset="${len.toFixed(0)}"${s.dashed ? ` opacity="0.85"` : ""}/>`;
                if (s.name) svg += `<g id="${id}-n${si}" opacity="0"><line x1="${L + si * 300}" y1="-6" x2="${L + si * 300 + 50}" y2="-6" stroke="${col}" stroke-width="9" stroke-linecap="round"/><text x="${L + si * 300 + 64}" y="3" font-size="28" font-weight="800" fill="${col}">${esc(s.name)}</text></g>`;
        if (v.valueLabels) pts.forEach((p, i) => (svg += `<g id="${id}-v${si}_${i}" opacity="0"><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="#fff" stroke="${col}" stroke-width="5"/><text x="${p[0]}" y="${p[1] - 20}" text-anchor="middle" font-size="26" font-weight="800" fill="${A.ink}">${esc(String(s.points[i]).replace(".", ","))}</text></g>`));
      });
      return {
        html: `<div class="stack center">${head}<svg class="linechart" viewBox="0 -40 ${W} ${H + 40}">${svg}</svg>${subHtml}</div>`,
        js: (t, d) => {
          const out = headJs(t);
          if (v.threshold) out.push(inn(`#${id}-thr`, t + 0.3));
          const per = Math.min(2.2, (d * 0.6) / v.series.length);
          v.series.forEach((s, si) => {
            const t0 = t + 0.5 + si * per;
            out.push(`tl.to("#${id}-p${si}", { attr: { "stroke-dashoffset": 0 }, duration: ${f(per)}, ease: "power1.inOut" }, ${f(t0)});`);
            if (s.name) out.push(`tl.to("#${id}-n${si}", { opacity: 1, duration: 0.3 }, ${f(t0)});`);
            if (v.valueLabels) s.points.forEach((_, i) => out.push(pop(`#${id}-v${si}_${i}`, t0 + (per * i) / Math.max(1, s.points.length - 1))));
          });
          return out.concat(subJs(t, d));
        },
      };
    }

    // ---------- Đồng hồ chu kỳ kinh tế ----------
    // active (0–3) | from→active (kim quay), reveal: true (lần lượt 4 giai đoạn), sectors: true
    case "cycle": {
      const R = 190, cx = 230, cy = 230;
      const ang = (i) => 135 + i * 90; // tâm góc phần tư: Phục hồi dưới-trái, Tăng trưởng trên-trái, Đỉnh trên-phải, Suy thoái dưới-phải
      const pt = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
      const arcs = PHASES.map((p, i) => {
        const a0 = 90 + i * 90 + 3, a1 = 180 + i * 90 - 3;
        const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, R - 70), [x3, y3] = pt(a0, R - 70);
        const on = v.active === i;
        const [lx, ly] = pt(ang(i), R + 62);
        return `<g id="${id}-q${i}"><path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R - 70} ${R - 70} 0 0 0 ${x3} ${y3} Z" fill="${on ? A.accent : "#fff"}" stroke="${A.ink}" stroke-width="5"/>
          <text x="${lx}" y="${ly + 10}" text-anchor="middle" font-size="40" font-weight="800" fill="${A.ink}">${esc(p.name)}</text></g>`;
      }).join("");
      const needleAng = v.active == null ? 270 : ang(v.active);
      const fromAng = v.from == null ? needleAng : ang(v.from);
      const list = v.sectors
        ? `<div class="cyc-list">${PHASES.map((p, i) => `<div class="cyc-row ${v.active === i ? "on" : ""}" id="${id}-r${i}"><b>${esc(p.name)}</b><span>${esc(p.sectors)}</span></div>`).join("")}</div>`
        : "";
      return {
        html: `<div class="stack center">${head}<div class="cyc-wrap"><svg class="cyc ${v.sectors ? "" : "solo"}" viewBox="-130 -80 720 620">${arcs}
          <circle cx="${cx}" cy="${cy}" r="${R - 70 - 14}" fill="${A.paper}" stroke="${A.line}" stroke-width="4"/>
          <g id="${id}-needle" transform="rotate(${fromAng} ${cx} ${cy})"><line x1="${cx}" y1="${cy}" x2="${cx + R - 92}" y2="${cy}" stroke="${A.ink}" stroke-width="10" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="16" fill="${A.ink}"/></g>
          <path d="M${pt(250, R + 18).join(" ")} A${R + 18} ${R + 18} 0 0 1 ${pt(290, R + 18).join(" ")}" fill="none" stroke="${A.muted}" stroke-width="4" marker-end="url(#${id}-ar)"/>
          <defs><marker id="${id}-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${A.muted}"/></marker></defs>
        </svg>${list}</div>${subHtml}</div>`,
        js: (t, d) => {
          const out = headJs(t);
          PHASES.forEach((_, i) => out.push(inn(`#${id}-q${i}`, v.reveal ? t + 0.3 + (i * d * 0.6) / 4 : t + 0.2 + i * 0.08)));
          if (v.sectors) PHASES.forEach((_, i) => out.push(inn(`#${id}-r${i}`, v.reveal ? t + 0.5 + (i * d * 0.6) / 4 : t + 0.4 + i * 0.1)));
          if (v.reveal) PHASES.forEach((_, i) => out.push(`tl.to("#${id}-needle", { attr: { transform: "rotate(${ang(i)} ${cx} ${cy})" }, duration: 0.5, ease: "back.out(1.6)" }, ${f(t + 0.3 + (i * d * 0.6) / 4)});`));
          else if (fromAng !== needleAng) out.push(`tl.to("#${id}-needle", { attr: { transform: "rotate(${needleAng} ${cx} ${cy})" }, duration: 1.2, ease: "power2.inOut" }, ${f(t + 0.8)});`);
          if (v.active != null) out.push(`tl.fromTo("#${id}-q${v.active}", { scale: 1 }, { scale: 1.04, transformOrigin: "50% 50%", duration: 0.3, yoyo: true, repeat: 1 }, ${f(t + 1.6)});`);
          return out.concat(subJs(t, d));
        },
      };
    }

    // ---------- Kim chỉ số (PMI) ----------
    // value, from, min, max, mid, left, right
    case "gauge": {
      const min = v.min ?? 40, max = v.max ?? 60, mid = v.mid ?? 50;
      const a = (x) => -180 + ((x - min) / (max - min)) * 180;
      const cx = 300, cy = 300, R = 240;
      const P = (deg, r) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
      const arc = (d0, d1, col) => {
        const [x0, y0] = P(d0, R), [x1, y1] = P(d1, R);
        return `<path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="46"/>`;
      };
      const ticks = [min, mid, max].map((x) => { const [tx, ty] = P(a(x), R + 46); return `<text x="${tx}" y="${ty + 10}" text-anchor="middle" font-size="30" font-weight="700" fill="${A.muted}">${x}</text>`; }).join("");
      return {
        html: `<div class="stack center">${head}<svg class="gauge" viewBox="-30 0 660 410">${arc(-180, a(mid) - 1, "#F6B6B8")}${arc(a(mid) + 1, 0, A.accent)}${ticks}
          <text x="${cx - 160}" y="${cy + 70}" text-anchor="middle" font-size="30" font-weight="800" fill="${A.down}">${esc(v.left || "Thu hẹp")}</text>
          <text x="${cx + 160}" y="${cy + 70}" text-anchor="middle" font-size="30" font-weight="800" fill="${A.accentDark}">${esc(v.right || "Mở rộng")}</text>
          <g id="${id}-nd" transform="rotate(${a(v.from ?? mid)} ${cx} ${cy})"><line x1="${cx}" y1="${cy}" x2="${cx + R - 40}" y2="${cy}" stroke="${A.ink}" stroke-width="12" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="22" fill="${A.ink}"/></g>
        </svg><div class="gval" id="${id}-v">${esc(String(v.value).replace(".", ","))}</div>${subHtml}</div>`,
        js: (t, d) => [
          ...headJs(t),
          `tl.to("#${id}-nd", { attr: { transform: "rotate(${a(v.value)} ${cx} ${cy})" }, duration: 1.4, ease: "elastic.out(1, 0.6)" }, ${f(t + 0.6)});`,
          pop(`#${id}-v`, t + 1.2),
          ...subJs(t, d),
        ],
      };
    }

    // ---------- Phép cộng các khối ----------
    // items[{label, sub?}], result, op
    case "stack":
      return {
        html: `<div class="stack center">${head}<div class="blocks">${v.items
          .map((it, i) => `${i ? `<div class="bop" id="${id}-o${i}">${esc(v.op || "+")}</div>` : ""}<div class="block b${i % 4}" id="${id}-b${i}"><b>${esc(it.label)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ""}</div>`)
          .join("")}<div class="bop" id="${id}-eq">=</div><div class="block res" id="${id}-r"><b>${esc(v.result)}</b></div></div>${subHtml}</div>`,
        js: (t, d) => {
          const st = steps(v.items.length + 1, t, d);
          const out = headJs(t);
          v.items.forEach((_, i) => {
            if (i) out.push(pop(`#${id}-o${i}`, st[i] - 0.1));
            out.push(inn(`#${id}-b${i}`, st[i]));
          });
          out.push(pop(`#${id}-eq`, st.at(-1) - 0.1), pop(`#${id}-r`, st.at(-1)));
          return out.concat(subJs(t, d));
        },
      };

    // ---------- Bảng ----------
    // columns[], rows[[...]], highlight[] (chỉ số hàng), note?
    case "table": {
      const hl = new Set(v.highlight || []);
      return {
        html: `<div class="stack center">${head}<table class="tbl"><thead><tr>${v.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${v.rows
          .map((r, i) => `<tr id="${id}-r${i}" class="${hl.has(i) ? "hl" : ""}">${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>${v.note ? `<p class="note" id="${id}-n">${esc(v.note)}</p>` : ""}${subHtml}</div>`,
        js: (t, d) => {
          const st = steps(v.rows.length, t + 0.2, d * 0.95);
          const out = headJs(t);
          v.rows.forEach((_, i) => out.push(inn(`#${id}-r${i}`, st[i])));
          if (v.note) out.push(inn(`#${id}-n`, t + d * 0.75));
          return out.concat(subJs(t, d));
        },
      };
    }

    // ---------- Chuỗi bước / domino ----------
    // items[{title, text?, tone?}], numbered, vertical
    case "steps": {
      const n = v.items.length;
      return {
        html: `<div class="stack center">${head}<div class="steps ${v.vertical ? "vert" : ""} n${n}">${v.items
          .map((it, i) => `${i ? `<div class="sarrow" id="${id}-a${i}">${v.vertical ? "↓" : "→"}</div>` : ""}<div class="sbox ${it.tone || ""}" id="${id}-s${i}">${v.numbered ? `<i>${i + 1}</i>` : ""}<b>${esc(it.title)}</b>${it.text ? `<span>${esc(it.text)}</span>` : ""}</div>`)
          .join("")}</div>${subHtml}</div>`,
        js: (t, d) => {
          const st = steps(n, t, d);
          const out = headJs(t);
          v.items.forEach((_, i) => {
            if (i) out.push(pop(`#${id}-a${i}`, st[i] - 0.15));
            out.push(inn(`#${id}-s${i}`, st[i]));
          });
          return out.concat(subJs(t, d));
        },
      };
    }

    // ---------- Cái cân ----------
    // left{title, items[]}, right{title, items[]}, tilt: left|right|none
    case "scale": {
      const deg = v.tilt === "left" ? -9 : v.tilt === "right" ? 9 : 0;
      const pan = (side, o, x) => `<g id="${id}-${side}" transform="translate(${x} 0)">
          <line x1="0" y1="0" x2="-90" y2="120" stroke="${A.ink}" stroke-width="4"/><line x1="0" y1="0" x2="90" y2="120" stroke="${A.ink}" stroke-width="4"/>
          <path d="M-130 120 H130 Q110 170 0 170 Q-110 170 -130 120 Z" fill="#fff" stroke="${A.ink}" stroke-width="5"/>
          <text y="155" text-anchor="middle" font-size="30" font-weight="800" fill="${A.ink}">${esc(o.title)}</text></g>`;
      return {
        html: `<div class="stack center">${head}<div class="scale-wrap">
          <div class="scale-list" id="${id}-ll">${v.left.items.map((x) => `<div>${esc(x)}</div>`).join("")}</div>
          <svg class="scale" viewBox="-300 -40 600 420"><path d="M-60 370 H60 L20 330 V40 H-20 V330 Z" fill="${A.ink}"/>
            <g id="${id}-beam" transform="rotate(0 0 40)"><line x1="-230" y1="40" x2="230" y2="40" stroke="${A.ink}" stroke-width="12" stroke-linecap="round"/>
            <g transform="translate(0 40)">${pan("pl", v.left, -230)}${pan("pr", v.right, 230)}</g></g><circle cx="0" cy="40" r="16" fill="${A.accent}" stroke="${A.ink}" stroke-width="5"/></svg>
          <div class="scale-list" id="${id}-rl">${v.right.items.map((x) => `<div>${esc(x)}</div>`).join("")}</div></div>${subHtml}</div>`,
        js: (t, d) => [
          ...headJs(t),
          inn(`#${id}-ll`, t + 0.4),
          inn(`#${id}-rl`, t + 0.7),
          `tl.to("#${id}-beam", { attr: { transform: "rotate(${deg} 0 40)" }, duration: 1.2, ease: "elastic.out(1, 0.5)" }, ${f(t + d * 0.45)});`,
          `tl.to("#${id}-pl", { attr: { transform: "translate(-230 0) rotate(${-deg} 0 0)" }, duration: 1.2, ease: "elastic.out(1, 0.5)" }, ${f(t + d * 0.45)});`,
          `tl.to("#${id}-pr", { attr: { transform: "translate(230 0) rotate(${-deg} 0 0)" }, duration: 1.2, ease: "elastic.out(1, 0.5)" }, ${f(t + d * 0.45)});`,
          ...subJs(t, d),
        ],
      };
    }

    // ---------- Bập bênh giá – lợi suất ----------
    // left, right (nhãn), dir: leftDown | rightDown
    case "seesaw": {
      const deg = v.dir === "leftDown" ? -14 : 14;
      return {
        html: `<div class="stack center">${head}<svg class="seesaw" viewBox="-480 -120 960 400">
          <path d="M-70 250 L0 120 L70 250 Z" fill="${A.ink}"/>
          <g id="${id}-b" transform="rotate(0 0 120)"><rect x="-420" y="104" width="840" height="24" rx="12" fill="${A.accent}" stroke="${A.ink}" stroke-width="5"/>
            <g transform="translate(-330 104)"><rect x="-100" y="-90" width="200" height="90" rx="18" fill="#fff" stroke="${A.ink}" stroke-width="5"/><text y="-34" text-anchor="middle" font-size="32" font-weight="800" fill="${A.ink}">${esc(v.left)}</text></g>
            <g transform="translate(330 104)"><rect x="-100" y="-90" width="200" height="90" rx="18" fill="#fff" stroke="${A.ink}" stroke-width="5"/><text y="-34" text-anchor="middle" font-size="32" font-weight="800" fill="${A.ink}">${esc(v.right)}</text></g></g>
          <text id="${id}-la" x="-330" y="-60" text-anchor="middle" font-size="64" font-weight="800" fill="${v.dir === "leftDown" ? A.down : A.accentDark}" opacity="0">${v.dir === "leftDown" ? "▼" : "▲"}</text>
          <text id="${id}-ra" x="330" y="-60" text-anchor="middle" font-size="64" font-weight="800" fill="${v.dir === "leftDown" ? A.accentDark : A.down}" opacity="0">${v.dir === "leftDown" ? "▲" : "▼"}</text>
        </svg>${subHtml}</div>`,
        js: (t, d) => [
          ...headJs(t),
          `tl.to("#${id}-b", { attr: { transform: "rotate(${deg} 0 120)" }, duration: 1, ease: "back.out(1.6)" }, ${f(t + 0.8)});`,
          `tl.to("#${id}-la", { opacity: 1, duration: 0.3 }, ${f(t + 1.4)});`,
          `tl.to("#${id}-ra", { opacity: 1, duration: 0.3 }, ${f(t + 1.6)});`,
          ...subJs(t, d),
        ],
      };
    }

    // ---------- Bể tiền ----------
    // label, inflows[], outflows[], from (0–1), to (0–1)
    case "tank": {
      const h = 300, y0 = 40;
      const lv = (x) => y0 + h - x * h;
      return {
        html: `<div class="stack center">${head}<div class="tank-wrap">
          <div class="tank-list in" id="${id}-in">${(v.inflows || []).map((x) => `<div>➜ ${esc(x)}</div>`).join("")}</div>
          <svg class="tank" viewBox="0 0 360 380"><defs><clipPath id="${id}-cl"><rect x="30" y="${y0}" width="300" height="${h}" rx="10"/></clipPath></defs>
            <g clip-path="url(#${id}-cl)"><g id="${id}-w" transform="translate(0 ${lv(v.from ?? 0.4) - y0})"><path d="M0 ${y0} Q45 ${y0 - 14} 90 ${y0} T180 ${y0} T270 ${y0} T360 ${y0} V${y0 + h + 400} H0 Z" fill="${A.accentSoft}" stroke="${A.accentDark}" stroke-width="5"/></g></g>
            <rect x="30" y="${y0}" width="300" height="${h}" rx="10" fill="none" stroke="${A.ink}" stroke-width="7"/>
            <text x="180" y="${y0 + h - 30}" text-anchor="middle" font-size="44" font-weight="800" fill="${A.ink}">${esc(v.label || "M2")}</text></svg>
          <div class="tank-list out" id="${id}-out">${(v.outflows || []).map((x) => `<div>${esc(x)} ➜</div>`).join("")}</div></div>${subHtml}</div>`,
        js: (t, d) => [
          ...headJs(t),
          inn(`#${id}-in`, t + 0.4),
          ...(v.outflows?.length ? [inn(`#${id}-out`, t + 0.7)] : []),
          `tl.to("#${id}-w", { attr: { transform: "translate(0 ${lv(v.to ?? 0.75) - y0})" }, duration: ${f(Math.max(1.5, d * 0.5))}, ease: "power1.inOut" }, ${f(t + 0.8)});`,
          ...subJs(t, d),
        ],
      };
    }

    // ---------- Thanh trượt ----------
    // label, steps[{x, value, label}], unit, company?
    case "slider": {
      const max = Math.max(...v.steps.map((s) => s.value));
      const n = v.steps.length;
      return {
        html: `<div class="stack">${head}<div class="sl-label">${esc(v.label)}</div>
          <div class="sl-track"><div class="sl-knob" id="${id}-k"></div>${v.steps.map((s, i) => `<div class="sl-tick" style="left:${(i / (n - 1)) * 100}%"><span>${esc(s.x)}</span></div>`).join("")}</div>
          <div class="sl-unit">${esc(v.unit)}</div>
          <div class="sl-bar-wrap"><div class="sl-bar" id="${id}-bar" style="width:${(v.steps[0].value / max) * 75}%"></div><div class="sl-vals">${v.steps.map((s, i) => `<div class="sl-val" id="${id}-l${i}" style="opacity:${i ? 0 : 1}">${esc(s.label)}</div>`).join("")}</div></div>${subHtml}</div>`,
        js: (t, d) => {
          const out = headJs(t);
          const st = steps(n, t, d);
          v.steps.forEach((s, i) => {
            if (!i) return;
            out.push(`tl.to("#${id}-k", { left: "${(i / (n - 1)) * 100}%", duration: 0.7, ease: "power2.inOut" }, ${f(st[i])});`);
            out.push(`tl.to("#${id}-bar", { width: "${(s.value / max) * 75}%", duration: 0.7, ease: "power2.inOut" }, ${f(st[i])});`);
            out.push(`tl.set("#${id}-l${i - 1}", { opacity: 0 }, ${f(st[i] + 0.35)});`);
            out.push(`tl.set("#${id}-l${i}", { opacity: 1 }, ${f(st[i] + 0.35)});`);
          });
          return out.concat(subJs(t, d));
        },
      };
    }

    // ---------- Lưới thẻ ----------
    // items[{title, text, tone: good|bad|neutral}], cols
    case "grid": {
      const cols = v.cols || (v.items.length === 4 ? 2 : 3);
      return {
        html: `<div class="stack center">${head}<div class="grid" style="grid-template-columns: repeat(${cols}, 1fr)">${v.items
          .map((it, i) => `<div class="gcard ${it.tone || ""}" id="${id}-g${i}"><b>${esc(it.title)}</b>${it.text ? `<span>${esc(it.text)}</span>` : ""}</div>`)
          .join("")}</div>${subHtml}</div>`,
        js: (t, d) => {
          const st = steps(v.items.length, t, d);
          return headJs(t).concat(v.items.map((_, i) => inn(`#${id}-g${i}`, st[i])), subJs(t, d));
        },
      };
    }

    // ---------- Chip (giỏ hàng CPI…) ----------
    case "chips": {
      const hl = new Set(v.highlight || []);
      return {
        html: `<div class="stack center">${head}<div class="chips">${v.chips.map((c, i) => `<div class="chip ${hl.has(i) ? "hl" : ""} ${v.dim && !hl.has(i) ? "dim" : ""}" id="${id}-c${i}">${esc(c)}</div>`).join("")}</div>${subHtml}</div>`,
        js: (t, d) => headJs(t).concat(v.chips.map((_, i) => pop(`#${id}-c${i}`, t + 0.3 + i * Math.min(0.25, (d * 0.5) / v.chips.length))), subJs(t, d)),
      };
    }

    // ---------- Lịch ----------
    // month, events[{day, label, tone}]
    case "calendar": {
      const days = Array.from({ length: 35 }, (_, i) => i - (v.offset ?? 2) + 1);
      const ev = new Map((v.events || []).map((e) => [e.day, e]));
      return {
        html: `<div class="stack center">${head}<div class="cal"><div class="cal-m">${esc(v.month || "Tháng mẫu")}</div><div class="cal-grid">${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => `<div class="cal-h">${d}</div>`).join("")}${days
          .map((n) => {
            const e = ev.get(n);
            return `<div class="cal-d ${n < 1 || n > 30 ? "out" : ""} ${e ? "ev " + (e.tone || "") : ""}" ${e ? `id="${id}-e${n}"` : ""}><span>${n >= 1 && n <= 30 ? n : ""}</span>${e ? `<em>${esc(e.label)}</em>` : ""}</div>`;
          })
          .join("")}</div></div>${subHtml}</div>`,
        js: (t, d) => {
          const out = headJs(t);
          const evs = v.events || [];
          const st = steps(evs.length, t + 0.3, d * 0.9);
          evs.forEach((e, i) => out.push(pop(`#${id}-e${e.day}`, st[i])));
          return out.concat(subJs(t, d));
        },
      };
    }
    default:
      return null;
  }
}

export const extraCSS = (A) => `
.linechart { width: 1000px; height: auto; }
.cyc-wrap { display: flex; align-items: center; gap: 30px; }
.cyc { width: 600px; height: auto; } .cyc.solo { width: 640px; }
.cyc-list { display: flex; flex-direction: column; gap: 14px; width: 520px; text-align: left; }
.cyc-row { background: #fff; border: 4px solid ${A.ink}; border-radius: 18px; padding: 14px 22px; display: flex; flex-direction: column; gap: 4px; }
.cyc-row b { font-size: 32px; } .cyc-row span { font-size: 27px; color: ${A.muted}; }
.cyc-row.on { background: ${A.accent}; box-shadow: 6px 6px 0 ${A.ink}; } .cyc-row.on span { color: ${A.ink}; }
.gauge { width: 700px; height: auto; }
.gval { font-size: 96px; font-weight: 800; margin-top: -40px; }
.blocks { display: flex; align-items: center; gap: 14px; flex-wrap: nowrap; }
.block { width: 190px; min-height: 170px; border: 4px solid ${A.ink}; border-radius: 22px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 14px; gap: 8px; }
.block b { font-size: 30px; line-height: 1.15; } .block span { font-size: 22px; color: ${A.muted}; }
.block.b0 { background: ${A.accentSoft}; } .block.b1 { background: #FFF1C9; } .block.b2 { background: #E3E9FF; } .block.b3 { background: #FFE1E2; }
.block.res { background: ${A.ink}; color: #fff; width: 170px; } .block.res b { font-size: 46px; }
.bop { font-size: 52px; font-weight: 800; color: ${A.muted}; }
.tbl { border-collapse: separate; border-spacing: 0; width: 1120px; font-size: 30px; background: #fff; border: 4px solid ${A.ink}; border-radius: 22px; overflow: hidden; }
.tbl th { background: ${A.ink}; color: #fff; text-align: left; padding: 16px 22px; font-weight: 800; }
.tbl td { padding: 14px 22px; border-top: 3px solid ${A.line}; line-height: 1.25; }
.tbl tr.hl td { background: ${A.accentSoft}; font-weight: 700; }
.steps { display: flex; align-items: stretch; gap: 12px; }
.steps.vert { flex-direction: column; align-items: center; }
.sbox { position: relative; background: #fff; border: 4px solid ${A.ink}; border-radius: 22px; padding: 22px 18px; width: 240px; display: flex; flex-direction: column; gap: 8px; text-align: center; justify-content: center; }
.steps.n3 .sbox { width: 320px; } .steps.n2 .sbox { width: 440px; } .steps.n5 .sbox { width: 190px; }
.steps.vert .sbox { width: 820px; flex-direction: row; text-align: left; align-items: center; gap: 18px; padding: 16px 24px; }
.sbox b { font-size: 30px; line-height: 1.2; } .sbox span { font-size: 24px; color: ${A.muted}; line-height: 1.3; }
.sbox i { font-style: normal; width: 52px; height: 52px; border-radius: 50%; background: ${A.ink}; color: ${A.accent}; font-weight: 800; font-size: 28px; display: flex; align-items: center; justify-content: center; align-self: center; flex-shrink: 0; }
.sbox.good { background: ${A.accentSoft}; } .sbox.bad { background: #FFE1E2; } .sbox.key { background: ${A.ink}; color: #fff; } .sbox.key span { color: #D7DCEC; }
.sarrow { align-self: center; font-size: 44px; font-weight: 800; color: ${A.muted}; }
.scale-wrap { display: flex; align-items: center; gap: 10px; }
.scale { width: 560px; height: auto; }
.scale-list { display: flex; flex-direction: column; gap: 12px; width: 270px; }
.scale-list div { background: #fff; border: 3px solid ${A.ink}; border-radius: 14px; padding: 10px 14px; font-size: 24px; font-weight: 600; line-height: 1.2; }
.seesaw { width: 980px; height: auto; }
.tank-wrap { display: flex; align-items: center; gap: 24px; }
.tank { width: 360px; height: auto; }
.tank-list { display: flex; flex-direction: column; gap: 14px; width: 360px; }
.tank-list div { font-size: 28px; font-weight: 700; background: #fff; border: 3px solid ${A.ink}; border-radius: 14px; padding: 12px 16px; }
.tank-list.in div { border-color: ${A.accentDark}; } .tank-list.out div { border-color: ${A.down}; }
.sl-label, .sl-unit { font-size: 36px; font-weight: 800; }
.sl-track { position: relative; height: 18px; background: ${A.line}; border-radius: 9px; margin: 34px 30px 64px; }
.sl-knob { position: absolute; left: 0%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: ${A.accent}; border: 5px solid ${A.ink}; z-index: 2; }
.sl-tick { position: absolute; top: 34px; transform: translateX(-50%); font-size: 30px; font-weight: 700; color: ${A.muted}; }
.sl-bar-wrap { display: flex; align-items: center; gap: 24px; height: 96px; }
.sl-bar { height: 96px; background: ${A.accent}; border: 4px solid ${A.ink}; border-radius: 20px; }
.sl-vals { position: relative; flex: 1; height: 80px; }
.sl-val { position: absolute; left: 0; top: 0; font-size: 56px; font-weight: 800; white-space: nowrap; }
.grid { display: grid; gap: 22px; width: 1120px; }
.gcard { background: #fff; border: 4px solid ${A.ink}; border-radius: 22px; padding: 22px 24px; display: flex; flex-direction: column; gap: 8px; }
.gcard b { font-size: 32px; line-height: 1.2; } .gcard span { font-size: 26px; color: ${A.muted}; line-height: 1.3; }
.gcard.good { background: ${A.accentSoft}; } .gcard.bad { background: #FFE1E2; } .gcard.warn { background: #FFF1C9; }
.chips { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; width: 1100px; }
.chip { font-size: 30px; font-weight: 700; background: #fff; border: 4px solid ${A.ink}; border-radius: 40px; padding: 12px 26px; }
.chip.hl { background: ${A.accent}; } .chip.dim { opacity: 0.35; text-decoration: line-through; }
.cal { background: #fff; border: 4px solid ${A.ink}; border-radius: 24px; padding: 18px 22px; width: 1080px; }
.cal-m { font-size: 32px; font-weight: 800; margin-bottom: 10px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-h { font-size: 22px; font-weight: 800; color: ${A.muted}; text-align: center; }
.cal-d { min-height: 86px; border-radius: 12px; background: ${A.paper}; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
.cal-d span { font-size: 20px; font-weight: 700; color: ${A.muted}; }
.cal-d.out { opacity: 0.3; }
.cal-d.ev { background: ${A.accentSoft}; border: 3px solid ${A.ink}; } .cal-d.ev.warn { background: #FFF1C9; } .cal-d.ev.ink { background: #E3E9FF; }
.cal-d em { font-style: normal; font-size: 20px; font-weight: 800; line-height: 1.15; color: ${A.ink}; }
`;
