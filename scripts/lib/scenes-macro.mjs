// Các kiểu cảnh riêng cho chuỗi Kinh tế vĩ mô: bảng điều khiển, chuỗi tác động, thẻ doanh nghiệp,
// so sánh hai cột, con nước, quiz, sổ tay. Được gọi từ renderScene() trong scripts/build.mjs.

import { DASHBOARD, COMPANIES, companyIcon } from "./series.mjs";

export function macroScene(v, id, ctx) {
  const { inn, pop, steps, esc, f, A } = ctx;
  switch (v.type) {
    // ---------- Bảng điều khiển vĩ mô ----------
    // fields: headline?, show[] (nhóm đã sáng sẵn), reveal[] (nhóm sáng lần lượt), blink (nhóm nhấp nháy), lit[] (chỉ số sáng)
    case "dashboard": {
      const show = new Set(v.show || []);
      const reveal = v.reveal || [];
      const lit = new Set(v.lit || []);
      const tiles = DASHBOARD.map(
        (g, i) => `<div class="tile ${show.has(g.key) ? "on" : ""}" id="${id}-g${i}">
          <div class="tile-bar"></div><div class="tile-name">${esc(g.name)}</div>
          ${g.items.map((it, k) => `<div class="tile-item ${lit.has(it) ? "lit" : ""}" id="${id}-g${i}i${k}">${esc(it)}</div>`).join("")}
        </div>`
      ).join("");
      return {
        html: `<div class="stack center">${v.headline ? `<h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>` : ""}
          <div class="dash">${tiles}</div>${v.sub ? `<p class="sub" id="${id}-s">${esc(v.sub)}</p>` : ""}</div>`,
        js: (t, d) => {
          const out = [];
          if (v.headline) out.push(pop(`#${id}-h`, t + 0.1));
          DASHBOARD.forEach((g, i) =>
            out.push(`tl.fromTo("#${id}-g${i}", { opacity: 0, y: 30 }, { opacity: ${show.has(g.key) ? 1 : 0.35}, y: 0, duration: 0.45, ease: "power3.out" }, ${f(t + 0.2 + i * 0.08)});`)
          );
          const st = steps(reveal.length, t + 0.7, d * 0.85);
          reveal.forEach((key, r) => {
            const i = DASHBOARD.findIndex((g) => g.key === key);
            out.push(`tl.to("#${id}-g${i}", { opacity: 1, duration: 0.3 }, ${f(st[r])});`);
            out.push(`tl.fromTo("#${id}-g${i} .tile-bar", { opacity: 1, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.4, ease: "power2.out" }, ${f(st[r])});`);
            out.push(`tl.fromTo("#${id}-g${i}", { scale: 1 }, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, ${f(st[r])});`);
            DASHBOARD[i].items.forEach((_, k) => out.push(inn(`#${id}-g${i}i${k}`, st[r] + 0.2 + k * 0.12)));
          });
          if (v.blink) {
            const i = DASHBOARD.findIndex((g) => g.key === v.blink);
            out.push(`tl.fromTo("#${id}-g${i}", { scale: 1 }, { scale: 1.08, duration: 0.35, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${f(t + 0.8)});`);
            out.push(`tl.to("#${id}-g${i}", { opacity: 1, duration: 0.3 }, ${f(t + 0.8)});`);
          }
          if (v.sub) out.push(inn(`#${id}-s`, t + d * 0.5));
          return out;
        },
      };
    }

    // ---------- Chuỗi tác động 4 ô ----------
    // fields: headline?, highlight: profit|valuation|both|none, dir: up|down, caption?
    case "chain": {
      const hl = v.highlight || "none";
      const arrow = v.dir === "down" ? "▼" : "▲";
      const cls = v.dir === "down" ? "down" : "up";
      const box = (key, label) => {
        const on = hl === "both" || hl === key;
        return `<div class="cbox ${on ? "on " + cls : ""}" id="${id}-${key}">${esc(label)}${on ? `<span class="badge ${cls}" id="${id}-${key}-b">${arrow}</span>` : ""}</div>`;
      };
      return {
        html: `<div class="stack center">${v.headline ? `<h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>` : ""}
          <div class="chain">
            <div class="cbox" id="${id}-macro">Biến số vĩ mô</div><div class="carrow" id="${id}-a1">→</div>
            <div class="cbox" id="${id}-sector">Ngành, doanh nghiệp</div><div class="carrow" id="${id}-a2">→</div>
            <div class="cpair">${box("profit", "Lợi nhuận")}${box("valuation", "Định giá")}</div><div class="carrow" id="${id}-a3">→</div>
            <div class="cbox price" id="${id}-price">Giá cổ phiếu${hl !== "none" ? `<span class="badge ${cls}" id="${id}-price-b">${arrow}</span>` : ""}</div>
          </div>${v.caption ? `<p class="sub" id="${id}-c">${esc(v.caption)}</p>` : ""}</div>`,
        js: (t, d) => {
          const seq = ["macro", "a1", "sector", "a2", "profit", "valuation", "a3", "price"];
          const out = v.headline ? [pop(`#${id}-h`, t + 0.1)] : [];
          const quick = hl !== "none";
          seq.forEach((k, i) => out.push(inn(`#${id}-${k}`, t + 0.2 + i * (quick ? 0.06 : 0.22))));
          const tb = t + (quick ? 0.9 : 2.2);
          ["profit", "valuation", "price"].forEach((k, i) => {
            if (hl === "both" || hl === k || (k === "price" && hl !== "none")) out.push(pop(`#${id}-${k}-b`, tb + i * 0.35));
          });
          if (v.caption) out.push(inn(`#${id}-c`, t + d * 0.45));
          return out;
        },
      };
    }

    // ---------- Thẻ doanh nghiệp giả định (1–3 thẻ) ----------
    // fields: headline?, items[{company, rows[{k,v}], move: up|down|downBig|flat, moveLabel}]
    case "pair": {
      const moveTxt = { up: "▲", down: "▼", downBig: "▼▼", flat: "■" };
      const cards = v.items
        .map((it, i) => {
          const c = COMPANIES[it.company];
          return `<div class="ccard" id="${id}-c${i}">
            <div class="cicon">${companyIcon(it.company)}</div>
            <div class="cname">${esc(c.name)}</div><div class="ctag">Doanh nghiệp giả định</div>
            ${(it.rows || []).map((r, k) => `<div class="crow" id="${id}-c${i}r${k}"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div>`).join("")}
            ${it.move ? `<div class="cmove ${it.move}" id="${id}-c${i}m">${moveTxt[it.move]} ${esc(it.moveLabel || "")}</div>` : ""}
          </div>`;
        })
        .join("");
      return {
        html: `<div class="stack center">${v.headline ? `<h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>` : ""}<div class="cards">${cards}</div></div>`,
        js: (t, d) => {
          const out = v.headline ? [pop(`#${id}-h`, t + 0.1)] : [];
          v.items.forEach((it, i) => {
            out.push(inn(`#${id}-c${i}`, t + 0.25 + i * 0.25));
            (it.rows || []).forEach((_, k) => out.push(inn(`#${id}-c${i}r${k}`, t + d * 0.3 + k * 0.5 + i * 0.15)));
            if (it.move) out.push(pop(`#${id}-c${i}m`, t + d * (it.move === "downBig" ? 0.6 : 0.45)));
          });
          return out;
        },
      };
    }

    // ---------- So sánh hai cột ----------
    // fields: headline?, left{title,text}, right{title,text}
    case "versus":
      return {
        html: `<div class="stack center">${v.headline ? `<h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>` : ""}
          <div class="versus"><div class="vcol" id="${id}-l"><div class="vtitle">${esc(v.left.title)}</div><p>${esc(v.left.text)}</p></div>
          <div class="vs" id="${id}-x">vs</div>
          <div class="vcol hi" id="${id}-r"><div class="vtitle">${esc(v.right.title)}</div><p>${esc(v.right.text)}</p></div></div></div>`,
        js: (t, d) => [
          ...(v.headline ? [pop(`#${id}-h`, t + 0.1)] : []),
          inn(`#${id}-l`, t + d * 0.25),
          pop(`#${id}-x`, t + d * 0.5),
          inn(`#${id}-r`, t + d * 0.55),
        ],
      };

    // ---------- Con nước nâng hạ mọi con thuyền ----------
    case "tide": {
      const boat = (x, c) =>
        `<g transform="translate(${x} 0)"><path d="M-46 0 H46 L32 26 H-32 Z" fill="${c}" stroke="${A.ink}" stroke-width="5" stroke-linejoin="round"/><path d="M0 0 V-70 L36 -10 Z" fill="#fff" stroke="${A.ink}" stroke-width="5" stroke-linejoin="round"/></g>`;
      return {
        html: `<div class="stack center"><h2 class="h2" id="${id}-h">${esc(v.headline)}</h2>
          <svg class="tide" viewBox="0 0 900 360"><g id="${id}-w" transform="translate(0 0)">
            <g id="${id}-boats" transform="translate(0 150)">${boat(190, A.accent)}${boat(450, A.warn)}${boat(710, "#BFE8FF")}</g>
            <path d="M0 176 Q75 156 150 176 T300 176 T450 176 T600 176 T750 176 T900 176 V420 H0 Z" fill="${A.accentSoft}" stroke="${A.accentDark}" stroke-width="5"/>
          </g><line x1="0" y1="358" x2="900" y2="358" stroke="${A.line}" stroke-width="4"/></svg>
          <p class="sub" id="${id}-s">${esc(v.sub)}</p></div>`,
        js: (t, d) => [
          pop(`#${id}-h`, t + 0.1),
          `tl.fromTo("#${id}-w", { attr: { transform: "translate(0 40)" } }, { attr: { transform: "translate(0 -50)" }, duration: ${f(d * 0.35)}, ease: "sine.inOut" }, ${f(t + 0.3)});`,
          `tl.to("#${id}-w", { attr: { transform: "translate(0 70)" }, duration: ${f(d * 0.3)}, ease: "sine.inOut" }, ${f(t + 0.3 + d * 0.38)});`,
          inn(`#${id}-s`, t + d * 0.7),
        ],
      };
    }

    // ---------- Quiz ----------
    // fields: question, options[3], footer?
    case "quiz":
      return {
        html: `<div class="stack"><div class="qlabel" id="${id}-k">Câu hỏi cho bạn</div><div class="qq" id="${id}-q">${esc(v.question)}</div>
          ${v.options.map((o, i) => `<div class="qopt" id="${id}-o${i}"><span>${"ABC"[i]}</span>${esc(o)}</div>`).join("")}
          <div class="qfoot" id="${id}-f">${esc(v.footer || "Đáp án nằm trong bài viết bên dưới ↓")}</div></div>`,
        js: (t, d) => [
          inn(`#${id}-k`, t + 0.1),
          inn(`#${id}-q`, t + 0.3),
          ...v.options.map((_, i) => inn(`#${id}-o${i}`, t + d * 0.35 + i * 0.3)),
          pop(`#${id}-f`, t + d * 0.7),
        ],
      };

    // ---------- Sổ tay của An ----------
    // fields: entries[] (dòng cuối là dòng mới của tập này)
    case "notebook": {
      const n = v.entries.length;
      return {
        html: `<div class="notebook" id="${id}-n"><div class="nb-title">Sổ tay vĩ mô của An</div>
          ${v.entries.map((e, i) => `<div class="nb-line ${i === n - 1 ? "new" : ""}" id="${id}-e${i}"><span>${i + 1}.</span><em>${esc(e)}</em></div>`).join("")}</div>`,
        js: (t, d) => [
          inn(`#${id}-n`, t + 0.1),
          ...v.entries.slice(0, -1).map((_, i) => inn(`#${id}-e${i}`, t + 0.3 + i * 0.05)),
          `tl.fromTo("#${id}-e${n - 1}", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }, ${f(t + d * 0.35)});`,
        ],
      };
    }
    default:
      return null;
  }
}

export const macroCSS = (A) => `
.dash { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; width: 100%; }
.tile { position: relative; background: #fff; border: 4px solid ${A.ink}; border-radius: 22px; padding: 22px 14px 18px; min-height: 360px; opacity: 0.35; display: flex; flex-direction: column; gap: 12px; align-items: stretch; overflow: hidden; }
.tile.on { opacity: 1; }
.tile-bar { position: absolute; left: 0; top: 0; right: 0; height: 14px; background: ${A.accent}; transform-origin: left center; opacity: 0; }
.tile.on .tile-bar { opacity: 1; }
.tile-name { font-size: 32px; font-weight: 800; text-align: center; margin-top: 6px; }
.tile-item { font-size: 26px; font-weight: 600; text-align: center; padding: 10px 6px; border-radius: 12px; background: ${A.paper}; border: 3px solid ${A.line}; }
.tile-item.lit { background: ${A.accent}; border-color: ${A.ink}; }
.chain { display: flex; align-items: center; gap: 14px; }
.cbox { position: relative; background: #fff; border: 4px solid ${A.ink}; border-radius: 22px; padding: 26px 18px; width: 220px; text-align: center; font-size: 32px; font-weight: 700; line-height: 1.2; }
.cbox.price { background: ${A.ink}; color: #fff; }
.cbox.on.up { background: ${A.accentSoft}; } .cbox.on.down { background: #FFE1E2; }
.cpair { display: flex; flex-direction: column; gap: 18px; }
.carrow { font-size: 56px; font-weight: 800; color: ${A.muted}; }
.badge { position: absolute; top: -26px; right: -18px; width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #fff; border: 4px solid ${A.ink}; }
.badge.up { background: ${A.accentDark}; } .badge.down { background: ${A.down}; }
.cards { display: flex; gap: 40px; justify-content: center; }
.ccard { width: 470px; background: #fff; border: 4px solid ${A.ink}; border-radius: 28px; box-shadow: 8px 8px 0 ${A.ink}; padding: 28px 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cicon { width: 120px; height: 120px; } .cicon svg { width: 100%; height: 100%; }
.cname { font-size: 40px; font-weight: 800; text-align: center; }
.ctag { font-size: 22px; color: ${A.muted}; margin-top: -6px; }
.crow { width: 100%; display: flex; justify-content: space-between; font-size: 30px; padding-top: 10px; border-top: 3px dashed ${A.line}; }
.crow b { font-weight: 800; }
.cmove { font-size: 36px; font-weight: 800; padding: 10px 26px; border-radius: 40px; color: #fff; border: 4px solid ${A.ink}; }
.cmove.down { background: #F0868A; } .cmove.downBig { background: ${A.down}; } .cmove.up { background: ${A.accentDark}; } .cmove.flat { background: ${A.muted}; }
.versus { display: flex; align-items: stretch; gap: 30px; }
.vcol { width: 500px; background: #fff; border: 4px solid ${A.ink}; border-radius: 28px; padding: 34px 36px; }
.vcol.hi { background: ${A.accentSoft}; box-shadow: 8px 8px 0 ${A.ink}; }
.vtitle { font-size: 54px; font-weight: 800; margin-bottom: 16px; }
.vcol p { font-size: 34px; line-height: 1.35; color: ${A.ink}; }
.vs { align-self: center; font-size: 44px; font-weight: 800; color: ${A.muted}; }
.tide { width: 900px; height: auto; }
.qlabel { font-size: 30px; font-weight: 700; color: ${A.accentDark}; text-transform: uppercase; letter-spacing: 0.06em; }
.qq { font-size: 52px; font-weight: 800; line-height: 1.2; }
.qopt { display: flex; align-items: center; gap: 22px; font-size: 38px; font-weight: 600; background: #fff; border: 4px solid ${A.ink}; border-radius: 20px; padding: 18px 26px; }
.qopt span { width: 60px; height: 60px; flex-shrink: 0; border-radius: 50%; background: ${A.ink}; color: ${A.accent}; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.qfoot { align-self: flex-start; font-size: 34px; font-weight: 800; background: ${A.accent}; border: 4px solid ${A.ink}; border-radius: 40px; padding: 12px 30px; }
.notebook { width: 980px; background: #FFFDF5; border: 4px solid ${A.ink}; border-radius: 22px; box-shadow: 10px 10px 0 ${A.ink}; padding: 36px 50px 44px 96px; position: relative;
  background-image: repeating-linear-gradient(transparent 0 66px, ${A.line} 66px 69px); background-position: 0 96px; }
.notebook::before { content: ""; position: absolute; left: 66px; top: 0; bottom: 0; width: 4px; background: #F0868A; }
.nb-title { font-size: 40px; font-weight: 800; margin-bottom: 18px; }
.nb-line { font-size: 34px; line-height: 69px; display: flex; gap: 16px; }
.nb-line span { font-weight: 800; color: ${A.muted}; }
.nb-line em { font-style: normal; }
.nb-line.new em { font-weight: 700; background: linear-gradient(transparent 58%, ${A.accent} 58% 88%, transparent 88%); }
`;
