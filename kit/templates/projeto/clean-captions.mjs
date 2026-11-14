#!/usr/bin/env node
// Clean captions (@hank.ironwood structure, Apple look): small brown line on top, big orange
// keyword(s), no outline. Each word enters at the instant it is spoken.
//
// Usage (project root): node scripts/clean-captions.mjs
// Reads STORYBOARD.md (frame order + duration), audio_meta.json (words per frame),
// captions-groups.txt (one block per line, units separated by "·", keywords marked with "*")
// and captions-mute.json ([[start, end], …] in global seconds: windows where the scene's typography
// already shows the sentence, so the captions disappear). Writes compositions/captions.html.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const W = 1080;
const H = 1920;
const BAND_CENTER = 1318; // band y 1190–1446 (Instagram safe zone)

const sb = readFileSync("STORYBOARD.md", "utf8").replace(/^\uFEFF/, ""); // a file saved with a BOM (Windows) would break the 1st heading
const frames = [];
let cur = null;
for (const line of sb.split(/\r?\n/)) {
  const h = line.match(/^##\s+Frame\s+(\d+)/i);
  if (h) {
    cur = { n: Number(h[1]), dur: 0 };
    frames.push(cur);
    continue;
  }
  const d = cur && line.match(/^-\s+duration:\s*([\d.]+)s/i);
  if (d) cur.dur = Number(d[1]);
}
let acc = 0;
const startOf = new Map();
for (const f of frames) {
  startOf.set(f.n, acc);
  acc += f.dur;
}
const TOTAL = Number(acc.toFixed(3));

const meta = JSON.parse(readFileSync("audio_meta.json", "utf8"));
const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}%]/gu, "").toLowerCase();
const flat = [];
for (const v of meta.voices) {
  const base = startOf.get(v.frame) ?? 0;
  for (const w of v.words) flat.push({ text: w.text, at: Number((base + w.start).toFixed(3)), end: Number((base + w.end).toFixed(3)) });
}

const spec = readFileSync("captions-groups.txt", "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const groups = [];
let i = 0;
for (const line of spec) {
  const units = line.split("·").map((u) => u.trim());
  const g = { words: [], keys: [] };
  units.forEach((u, k) => {
    const w = flat[i++];
    if (!w || norm(w.text) !== norm(u.replace(/^\*/, ""))) console.warn(`⚠ block "${line}": expected "${u}", got "${w?.text}"`);
    if (w) g.words.push(w);
    if (u.startsWith("*")) g.keys.push(k);
  });
  if (!g.keys.length) g.keys.push(g.words.length - 1);
  groups.push(g);
}
if (i !== flat.length) console.warn(`⚠ ${flat.length - i} word(s) without a block`);

const mute = existsSync("captions-mute.json") ? JSON.parse(readFileSync("captions-mute.json", "utf8")) : [];
const muted = (t) => mute.some(([a, b]) => t >= a - 0.001 && t < b);

// each block lives from its first word until the next block (or 0.5s after the last word, if there is silence)
groups.forEach((g, k) => {
  const next = groups[k + 1];
  const lastW = g.words[g.words.length - 1];
  const tail = lastW.end + 0.5;
  g.out = next ? Math.min(next.words[0].at, Math.max(tail, lastW.at + 0.35)) : Math.min(TOTAL, tail + 0.6);
});
const shown = groups.filter((g) => !muted(g.words[0].at));

const data = shown.map((g) => ({
  keys: g.keys,
  out: Number(g.out.toFixed(3)),
  words: g.words.map((w) => ({ t: w.text, at: w.at })),
}));

const html = `<template id="captions-template">
  <div data-composition-id="captions" data-width="${W}" data-height="${H}" data-duration="${TOTAL}" id="captions-root">
    <div id="cc-band"></div>
  </div>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@700;800&display=block");
    #captions-root { position: absolute; inset: 0; pointer-events: none; }
    #cc-band { position: absolute; left: 50px; right: 50px; top: ${BAND_CENTER - 150}px; height: 300px; }
    .cc-group { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; opacity: 0; }
    .cc-line { display: flex; gap: 18px; justify-content: center; white-space: nowrap; }
    .cc-w { display: inline-block; font-family: "Hanken Grotesk", sans-serif; }
    .cc-small { font-size: 52px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.05; color: #161210; }
    .cc-key { font-weight: 800; letter-spacing: -0.04em; line-height: 0.95; text-transform: uppercase; color: #ff4d17; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function () {
      var GROUPS = ${JSON.stringify(data).replace(/</g, "\\u003c")};
      var band = document.getElementById("cc-band");
      var tl = gsap.timeline({ paused: true });
      function keySize(txt) { var n = txt.length; return Math.max(92, Math.min(140, Math.floor(880 / (n * 0.6)))); }
      GROUPS.forEach(function (g) {
        var el = document.createElement("div");
        el.className = "cc-group";
        el.setAttribute("data-layout-allow-overlap", "");
        var first = Math.min.apply(null, g.keys), last = Math.max.apply(null, g.keys);
        var before = document.createElement("div"); before.className = "cc-line";
        var key = document.createElement("div"); key.className = "cc-line";
        var after = document.createElement("div"); after.className = "cc-line";
        var keyText = g.words.filter(function (w, i) { return i >= first && i <= last; }).map(function (w) { return w.t; }).join(" ");
        var ks = keySize(keyText);
        var spans = [];
        g.words.forEach(function (w, i) {
          var s = document.createElement("span");
          s.textContent = w.t;
          s.setAttribute("data-layout-allow-overlap", "");
          var isKey = i >= first && i <= last;
          if (isKey) { s.className = "cc-w cc-key"; s.style.fontSize = ks + "px"; key.appendChild(s); }
          else { s.className = "cc-w cc-small"; (i < first ? before : after).appendChild(s); }
          spans.push({ el: s, at: w.at, isKey: isKey });
        });
        [before, key, after].forEach(function (l) { if (l.childNodes.length) el.appendChild(l); });
        band.appendChild(el);
        var t0 = g.words[0].at;
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.01 }, t0);
        spans.forEach(function (s) {
          if (s.isKey) tl.fromTo(s.el, { opacity: 0, y: 34, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.3, ease: "expo.out" }, s.at);
          else tl.fromTo(s.el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.22, ease: "power3.out" }, s.at);
        });
        tl.to(el, { opacity: 0, y: -10, duration: 0.12, ease: "power2.in" }, Math.max(t0 + 0.2, g.out - 0.12));
      });
      window.__timelines = window.__timelines || {};
      window.__timelines["captions"] = tl;
    })();
  </script>
</template>
`;

mkdirSync("compositions", { recursive: true });
writeFileSync("compositions/captions.html", html);
console.log(`✓ clean captions: ${data.length}/${groups.length} blocks (${groups.length - data.length} muted) · ${TOTAL}s → compositions/captions.html`);
console.log(data.map((g) => g.words.map((w, i) => (g.keys.includes(i) ? w.t.toUpperCase() : w.t)).join(" ")).join(" | "));
