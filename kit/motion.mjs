#!/usr/bin/env node
// motion.mjs — toolkit for the "anti-slop motion" method.
// Only needs Node 18+ and ffmpeg/ffprobe on PATH. Runs the same on Windows, macOS and Linux.
//
//   node motion.mjs help
//
// Commands:
//   ref       studies a reference video: frames every N s, contact sheet and cut rhythm
//   phone     fits a real phone screenshot into the mockup iPhone screen (393×852 pt at 3x)
//   alpha     recovers transparency from an opaque export (rendered over black and over white)
//   critique  builds the critique material: contact sheet, 12-frame strip, phone-size test, poster, loudness
//   finish    normalizes audio (2-pass loudnorm) and never overwrites a delivery
//   sfx       synthesizes effects (click, pop, whoosh, thump, chime, tick) from a list of cues
//   receiver  local server that saves files uploaded from a page (capture from a logged-in browser)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, join } from "node:path";

const HELP = `motion.mjs — anti-slop motion toolkit (Node 18+ and ffmpeg on PATH)

  ref <video> [--every 0.5] [--out refs/quadros] [--scene 0.15]
      reference frames, folha.jpg (contact sheet) and cortes.json (cuts, average shot length, biggest changes)

  phone <screenshot> --probe
      shows the ink bands at the top of the screenshot so you can pick --clear-top
  phone <screenshot> --out <screen.png> [--clear-top <px>] [--statusbar <bar.png>] [--ink black|white]
        [--w 393] [--h 852] [--scale 3]
      fits the screenshot into the device screen; clears the original status bar and draws the kit one

  alpha <over-black.png> <over-white.png> <out.png>
      exact transparency from two opaque exports

  critique <video> [--out critica] [--at <s>] [--poster <s>]
      folha.jpg (sheet), tira.jpg (12 consecutive frames from --at), celular.jpg (360 px phone test), capa.png (poster) + report

  finish <raw.mp4> <final.mp4> [--lufs -14] [--force]
      2-pass loudnorm (TP -1.5 dB); refuses to overwrite <final.mp4> without --force

  sfx <cues.json> <out.wav>
      cues: [{"t":0.5,"type":"pop","gain":0.8}, ...]  types: click pop whoosh thump chime tick

  receiver [--dir capturas] [--port 8787]
      page with <input type=file> at http://127.0.0.1:<port>; also accepts POST /save?name=file
`;

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

function opt(args, name, def) {
  const i = args.indexOf("--" + name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

function flag(args, name) {
  const i = args.indexOf("--" + name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}

function ff(args, opts = {}) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 1 << 30, ...opts });
  if (r.error) die("ffmpeg not found on PATH");
  if (r.status !== 0) die("ffmpeg failed: " + String(r.stderr || "").slice(-800));
  return r.stdout;
}

// runs ffmpeg only to read what it writes to stderr (analysis filters)
function ffLog(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...args], { encoding: "utf8", maxBuffer: 1 << 29 });
  if (r.error) die("ffmpeg not found on PATH");
  return r.stderr || "";
}

function probe(file) {
  if (!existsSync(file)) die("file not found: " + file);
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", file], { encoding: "utf8" });
  if (r.error) die("ffprobe not found on PATH");
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video") || {};
  return {
    w: v.width,
    h: v.height,
    fps: v.r_frame_rate,
    dur: Number(j.format && j.format.duration) || 0,
    audio: (j.streams || []).some((s) => s.codec_type === "audio"),
  };
}

function loudness(file) {
  const log = ffLog(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const tail = log.slice(log.lastIndexOf("Summary:"));
  const I = tail.match(/I:\s+(-?[\d.]+|-inf) LUFS/);
  const P = tail.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/);
  return { I: I ? I[1] : "?", peak: P ? P[1] : "?" };
}

// ─── ref ────────────────────────────────────────────────────────────────────
function cmdRef(args) {
  const every = Number(opt(args, "every", "0.5"));
  const out = opt(args, "out", "refs/quadros");
  const scene = Number(opt(args, "scene", "0.15"));
  const [video] = args;
  if (!video) die("usage: ref <video> [--every 0.5] [--out refs/quadros] [--scene 0.15]");
  const p = probe(video);
  mkdirSync(out, { recursive: true });
  ff(["-i", video, "-vf", `fps=1/${every},scale=540:-2`, join(out, "q-%03d.jpg")]);
  const n = Math.max(1, Math.floor(p.dur / every));
  const cols = 8;
  ff(["-i", video, "-vf", `fps=1/${every},scale=180:-2,tile=${cols}x${Math.ceil(n / cols)}`, "-frames:v", "1", join(out, "folha.jpg")]);
  // shot changes: the reference rhythm in numbers. Motion work often uses soft transitions (low score),
  // so besides the cuts above the threshold, the biggest change peaks are recorded too.
  const log = ffLog(["-i", video, "-vf", "select='gte(scene,0)',metadata=print:key=lavfi.scene_score", "-f", "null", "-"]);
  const scores = [...log.matchAll(/pts_time:([\d.]+)[\s\S]*?lavfi\.scene_score=([\d.]+)/g)].map((m) => ({ t: Number(m[1]), s: Number(m[2]) }));
  // similar background on both sides (cream→cream) drops the score of a hard cut: 0.15 catches those cuts
  const cuts = scores.filter((x) => x.s > scene).map((x) => x.t).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.25);
  const picos = [...scores].sort((a, b) => b.s - a.s).slice(0, 12).sort((a, b) => a.t - b.t).map((x) => ({ t: Number(x.t.toFixed(2)), score: Number(x.s.toFixed(3)) }));
  const edges = [0, ...cuts, p.dur];
  const shots = edges.slice(1).map((b, i) => Number((b - edges[i]).toFixed(2))).filter((d) => d > 0.05);
  const media = shots.reduce((a, b) => a + b, 0) / (shots.length || 1);
  writeFileSync(join(out, "cortes.json"), JSON.stringify({ duracao: p.dur, limiar: scene, cortes: cuts, planos: shots, mediaPorPlano: Number(media.toFixed(2)), maioresMudancas: picos }, null, 1));
  console.log(`✓ ${n} frames in ${out}/ (folha.jpg, cortes.json)`);
  console.log(`  ${p.w}x${p.h} · ${p.dur.toFixed(1)}s · ${shots.length} shots with cut > ${scene} · average ${media.toFixed(2)}s per shot`);
  console.log(`  biggest changes: ${picos.map((x) => x.t + "s").join(" ")}`);
}

// ─── phone ──────────────────────────────────────────────────────────────────
function cmdPhone(args) {
  const out = opt(args, "out");
  const clearTop = Number(opt(args, "clear-top", "0"));
  const sb = opt(args, "statusbar");
  const ink = opt(args, "ink", "black");
  const w = Number(opt(args, "w", "393"));
  const h = Number(opt(args, "h", "852"));
  const sc = Number(opt(args, "scale", "3"));
  const doProbe = flag(args, "probe");
  const [src] = args;
  if (!src) die("usage: phone <screenshot> --probe | --out <screen.png> [--clear-top px] [--statusbar bar.png]");
  const p = probe(src);

  if (doProbe) {
    // rows with "ink" (different from the corner background) in the top quarter of the screenshot
    const raw = ff(["-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const bg = [raw[(4 * p.w + 4) * 3], raw[(4 * p.w + 4) * 3 + 1], raw[(4 * p.w + 4) * 3 + 2]];
    const runs = [];
    let start = -1;
    for (let y = 0; y < Math.floor(p.h / 4); y++) {
      let inked = false;
      for (let x = 0; x < p.w && !inked; x += 2) {
        const o = (y * p.w + x) * 3;
        if (Math.abs(raw[o] - bg[0]) + Math.abs(raw[o + 1] - bg[1]) + Math.abs(raw[o + 2] - bg[2]) > 40) inked = true;
      }
      if (inked && start < 0) start = y;
      if (!inked && start >= 0) {
        runs.push([start, y - 1]);
        start = -1;
      }
    }
    console.log(`screenshot ${p.w}x${p.h} (ratio ${(p.h / p.w).toFixed(3)}; iPhone screen ${(h / w).toFixed(3)}) · top background rgb(${bg.join(",")})`);
    runs.forEach((r, i) => console.log(`  band ${i + 1}: rows ${r[0]}–${r[1]}`));
    if (runs.length > 1) console.log(`suggestion: --clear-top ${Math.round((runs[0][1] + runs[1][0]) / 2)}  (clears the 1st band = status bar)`);
    return;
  }

  if (!out) die("missing --out <screen.png>");
  const W = Math.round(w * sc);
  const H = Math.round(h * sc);
  const Hs = Math.round((p.h * W) / p.w);
  const img = ff(["-i", src, "-vf", `scale=${W}:${Hs}:flags=lanczos`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const o0 = (4 * W + 4) * 3;
  const bg = [img[o0], img[o0 + 1], img[o0 + 2]];
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) buf.set(bg, i * 3);
  img.copy(buf, 0, 0, Math.min(Hs, H) * W * 3);
  const band = Math.round((clearTop * W) / p.w);
  for (let i = 0; i < band * W; i++) buf.set(bg, i * 3);
  if (sb) {
    // works with an opaque bar (black text on white background) and with a transparent bar
    const SBH = Math.round(54 * sc);
    const s = ff(["-i", sb, "-vf", `scale=${W}:${SBH}:flags=lanczos`, "-f", "rawvideo", "-pix_fmt", "rgba", "-"]);
    const to = ink === "white" ? 255 : 0;
    for (let i = 0; i < W * SBH; i++) {
      const lum = 0.299 * s[i * 4] + 0.587 * s[i * 4 + 1] + 0.114 * s[i * 4 + 2];
      const a = ((s[i * 4 + 3] / 255) * (255 - lum)) / 255;
      if (a <= 0) continue;
      for (let c = 0; c < 3; c++) buf[i * 3 + c] = Math.round(buf[i * 3 + c] * (1 - a) + to * a);
    }
  }
  ff(["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${W}x${H}`, "-i", "-", "-frames:v", "1", out], { input: buf });
  console.log(`✓ ${out} ${W}x${H} (screenshot ${p.w}x${p.h}; cleared bar ${band}px; background rgb(${bg.join(",")}))`);
}

// ─── alpha ──────────────────────────────────────────────────────────────────
// K = a·F (over black), W = a·F + (1−a)·255 (over white)  →  a = 1 − (W − K)/255 ; F = K / a
function cmdAlpha(args) {
  const [k, w, out] = args;
  if (!out) die("usage: alpha <over-black.png> <over-white.png> <out.png>");
  const p = probe(k);
  const K = ff(["-i", k, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const Wh = ff(["-i", w, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  if (K.length !== Wh.length) die("both exports must be the same size");
  const o = Buffer.alloc(p.w * p.h * 4);
  for (let i = 0, q = 0; i < K.length; i += 3, q += 4) {
    const d = (Wh[i] - K[i] + (Wh[i + 1] - K[i + 1]) + (Wh[i + 2] - K[i + 2])) / 3;
    const a = Math.max(0, Math.min(255, 255 - d));
    if (a < 1) continue;
    const s = 255 / a;
    o[q] = Math.min(255, Math.round(K[i] * s));
    o[q + 1] = Math.min(255, Math.round(K[i + 1] * s));
    o[q + 2] = Math.min(255, Math.round(K[i + 2] * s));
    o[q + 3] = Math.round(a);
  }
  ff(["-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${p.w}x${p.h}`, "-i", "-", "-frames:v", "1", out], { input: o });
  console.log(`✓ ${out} ${p.w}x${p.h}`);
}

// ─── critique ───────────────────────────────────────────────────────────────
function cmdCritique(args) {
  const out = opt(args, "out", "critica");
  const at = opt(args, "at");
  const poster = Number(opt(args, "poster", "1"));
  const [video] = args;
  if (!video) die("usage: critique <video> [--out critica] [--at s] [--poster s]");
  const p = probe(video);
  mkdirSync(out, { recursive: true });
  const fpsF = Math.min(2, 48 / p.dur);
  const nF = Math.max(1, Math.floor(p.dur * fpsF));
  ff(["-i", video, "-vf", `fps=${fpsF.toFixed(4)},scale=216:-2,tile=8x${Math.ceil(nF / 8)}`, "-frames:v", "1", join(out, "folha.jpg")]);
  const t = at != null ? Number(at) : p.dur / 2;
  ff(["-ss", String(t), "-i", video, "-vf", "scale=320:-2,tile=12x1", "-frames:v", "1", join(out, "tira.jpg")]);
  const fpsC = Math.min(1, 30 / p.dur);
  const nC = Math.max(1, Math.floor(p.dur * fpsC));
  ff(["-i", video, "-vf", `fps=${fpsC.toFixed(4)},scale=360:-2,tile=6x${Math.ceil(nC / 6)}`, "-frames:v", "1", join(out, "celular.jpg")]);
  ff(["-ss", String(poster), "-i", video, "-frames:v", "1", join(out, "capa.png")]);
  const L = p.audio ? loudness(video) : { I: "no audio", peak: "-" };
  console.log(`✓ ${out}/ folha.jpg · tira.jpg (12 frames from ${t.toFixed(2)}s) · celular.jpg · capa.png (${poster}s)`);
  console.log(`  ${p.w}x${p.h} · ${p.fps} fps · ${p.dur.toFixed(2)}s · loudness ${L.I} LUFS · peak ${L.peak} dBFS`);
}

// ─── finish ─────────────────────────────────────────────────────────────────
function cmdFinish(args) {
  const lufs = Number(opt(args, "lufs", "-14"));
  const force = flag(args, "force");
  const [src, dst] = args;
  if (!dst) die("usage: finish <raw.mp4> <final.mp4> [--lufs -14] [--force]");
  if (existsSync(dst) && !force) die(`${dst} already exists. Deliveries are never overwritten: use another name (v2, v3…) or --force`);
  const p = probe(src);
  if (!p.audio) {
    ff(["-i", src, "-c", "copy", "-movflags", "+faststart", dst]);
    console.log(`✓ ${dst} (no audio: just copied)`);
    return;
  }
  const target = `I=${lufs}:TP=-1.5:LRA=11`;
  const log = ffLog(["-i", src, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
  const second = `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ff(["-i", src, "-c:v", "copy", "-af", second, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst]);
  const L = loudness(dst);
  console.log(`✓ ${dst} · input ${m.input_i} LUFS → output ${L.I} LUFS (peak ${L.peak} dBFS) · ${p.dur.toFixed(2)}s`);
}

// ─── sfx ────────────────────────────────────────────────────────────────────
function cmdSfx(args) {
  const [cuesFile, out] = args;
  if (!out) die('usage: sfx <cues.json> <out.wav>   cues: [{"t":0.5,"type":"pop"}]');
  const cues = JSON.parse(readFileSync(cuesFile, "utf8"));
  const SR = 48000;
  const buf = new Float32Array(Math.ceil((Math.max(...cues.map((c) => c.t)) + 2) * SR));
  let seed = 42;
  const noise = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1; // deterministic
  const TAU = 2 * Math.PI;
  const VOICES = {
    click: [0.05, (t) => Math.sin(TAU * 1800 * t) * Math.exp(-t * 90) * 0.5],
    pop: [0.15, (t) => Math.sin(TAU * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4],
    whoosh: [0.35, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.6],
    thump: [0.5, (t) => Math.sin(TAU * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9],
    chime: [0.9, (t) => (Math.sin(TAU * 1318.5 * t) + 0.6 * Math.sin(TAU * 1975.5 * t)) * Math.exp(-t * 6) * 0.22],
    tick: [0.03, (t) => noise() * Math.exp(-t * 260) * 0.35],
  };
  for (const c of cues) {
    const v = VOICES[c.type];
    if (!v) die(`unknown type: ${c.type} (use ${Object.keys(VOICES).join(", ")})`);
    const [len, fn] = v;
    const g = c.gain == null ? 1 : c.gain;
    const start = Math.floor(c.t * SR);
    let lp = 0; // 1-pole low-pass: removes the harshness of the noise
    for (let i = 0; i < len * SR && start + i < buf.length; i++) {
      let x = fn(i / SR) * g;
      if (c.type === "whoosh") x = lp += (x - lp) * 0.18;
      buf[start + i] += x;
    }
  }
  const n = buf.length;
  const b = Buffer.alloc(44 + n * 2); // 16-bit mono WAV
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  writeFileSync(out, b);
  console.log(`✓ ${out} · ${cues.length} cues · ${(n / SR).toFixed(2)}s`);
}

// ─── receiver ───────────────────────────────────────────────────────────────
function cmdReceiver(args) {
  const dir = opt(args, "dir", "capturas");
  const port = Number(opt(args, "port", "8787"));
  mkdirSync(dir, { recursive: true });
  const page = `<!doctype html><meta charset="utf-8"><title>receiver</title>
<body style="font:16px sans-serif;padding:24px"><h3>Capture receiver</h3>
<input type="file" id="f" multiple><pre id="log"></pre>
<script>
document.getElementById("f").addEventListener("change", async (e) => {
  for (const file of e.target.files) {
    const r = await fetch("/save?name=" + encodeURIComponent(file.name), { method: "POST", body: file });
    document.getElementById("log").textContent += file.name + " → " + (await r.text()) + "\\n";
  }
  e.target.value = "";
});
</script></body>`;
  createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-private-network", "true");
    if (req.method === "OPTIONS") {
      res.setHeader("access-control-allow-methods", "POST");
      res.setHeader("access-control-allow-headers", "content-type");
      return res.end();
    }
    if (req.method === "POST" && url.pathname === "/save") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const name = basename(url.searchParams.get("name") || "captura.png");
        const data = Buffer.concat(chunks);
        writeFileSync(join(dir, name), data);
        console.log(`saved ${join(dir, name)} (${data.length} bytes)`);
        res.end("ok " + data.length);
      });
      return;
    }
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(page);
  }).listen(port, "127.0.0.1", () => console.log(`receiver at http://127.0.0.1:${port} → ${dir}/`));
}

const [cmd, ...rest] = process.argv.slice(2);
const table = { ref: cmdRef, phone: cmdPhone, alpha: cmdAlpha, critique: cmdCritique, finish: cmdFinish, sfx: cmdSfx, receiver: cmdReceiver };
if (!cmd || cmd === "help" || cmd === "--help" || !table[cmd]) {
  console.log(HELP);
  process.exit(cmd && !table[cmd] && cmd !== "help" && cmd !== "--help" ? 1 : 0);
}
table[cmd](rest);
