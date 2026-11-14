#!/usr/bin/env node
// Project narration: SCRIPT.md → Fish Audio (S2.1 Pro) → per-word timing →
// audio_meta.json (faceless-explainer format) + audio_engine_meta.json (sidecar
// that `audio.mjs fetch-sfx` uses to merge effects without erasing the voice).
//
// Usage (from the project root):
//   FISH_API_KEY=... node scripts/voice.mjs --voice <id> [--lang es] [--python <python>] [--only 03,05]
// Spoken-text syntax in SCRIPT.md: {shown|spoken} and [Fish tags].
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(".");
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};
const python = flag("python", "python");
const only = (flag("only", "") || "").split(",").filter(Boolean);
const pad2 = (n) => String(n).padStart(2, "0");

// Fish Audio voice: --voice <id> or FISH_VOICE_ID (find the id on fish.audio; voice language = video language)
const VOICE = flag("voice", process.env.FISH_VOICE_ID || "");
const LANG = flag("lang", process.env.VIDEO_LANG || "pt");
if (!VOICE) { console.error("Set the voice: --voice <id> or FISH_VOICE_ID."); process.exit(1); }
const MODEL = "s2.1-pro-free";

// SCRIPT.md: "## Line N — ... (Frame N)" opens a line; the indented block is the text.
function parseScript(md) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.text.trim()) out.push({ frame: cur.frame, text: cur.text.trim() });
    cur = null;
  };
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^#{2,3}\s+.*?\(frame\s+(\d+)\)/i);
    if (h) {
      flush();
      cur = { frame: Number(h[1]), text: "" };
      continue;
    }
    if (!cur || /^\s*\*\*/.test(line)) continue;
    const m = line.match(/^(?: {4,}|\t)(.+)$/);
    if (m) cur.text += (cur.text ? " " : "") + m[1].trim();
  }
  flush();
  return out;
}

const spoken = (t) => t.replace(/\{([^|{}]+)\|([^{}]+)\}/g, "$2");
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`✗ ${cmd} ${args[0]} exited with ${r.status}`);
    process.exit(1);
  }
};

const lines = parseScript(readFileSync(join(root, "SCRIPT.md"), "utf8").replace(/^\uFEFF/, ""));
const todo = lines.filter((l) => !only.length || only.includes(pad2(l.frame)));
const voicePath = (f) => `.media/audio/voice/${pad2(f)}.mp3`;

writeFileSync(
  join(root, ".media/voice-jobs.json"),
  JSON.stringify(
    { model: MODEL, voice: VOICE, lines: todo.map((l) => ({ id: pad2(l.frame), text: spoken(l.text), out: `../${voicePath(l.frame)}` })) },
    null,
    2,
  ),
);
writeFileSync(
  join(root, ".media/align-jobs.json"),
  JSON.stringify({ lines: todo.map((l) => ({ id: pad2(l.frame), text: l.text, out: `../${voicePath(l.frame)}` })) }, null, 2),
);

run("node", [join(root, "scripts/fish-tts.mjs"), join(root, ".media/voice-jobs.json")]);
run(python, [join(root, "scripts/align_words.py"), join(root, ".media/align-jobs.json"), join(root, ".media/align-out.json"), "--lang", LANG], {
  PYTHONIOENCODING: "utf-8",
});

const aligned = JSON.parse(readFileSync(join(root, ".media/align-out.json"), "utf8"));
const neutralPath = join(root, "audio_engine_meta.json");
const prev = existsSync(neutralPath) ? JSON.parse(readFileSync(neutralPath, "utf8")) : {};
const byId = new Map((prev.voices ?? []).map((v) => [v.id, v]));
for (const l of todo) {
  const id = pad2(l.frame);
  const a = aligned[id];
  byId.set(id, { id, path: voicePath(l.frame), duration_s: a.duration_s, words: a.words });
  if (a.match < 0.8) console.warn(`⚠ ${id}: transcript only matches ${(a.match * 100).toFixed(0)}% of the script — listen: "${a.heard}"`);
}
const voices = [...byId.values()].sort((x, y) => x.id.localeCompare(y.id));
const neutral = {
  ...prev,
  tts_provider: "fish-audio",
  voice_id: VOICE,
  bgm: prev.bgm ?? null,
  bgm_pending: false,
  voices,
  sfx: prev.sfx ?? [],
  total_duration_s: Number(voices.reduce((s, v) => s + v.duration_s, 0).toFixed(3)),
};
writeFileSync(neutralPath, JSON.stringify(neutral, null, 2));

const meta = {
  bgm: neutral.bgm,
  bgm_pending: false,
  voices: voices.map((v) => ({ frame: Number(v.id), path: v.path, duration_s: v.duration_s, words: v.words })),
  sfx: (neutral.sfx ?? []).map((s) => ({
    frame: Number(s.id),
    file: s.file,
    offset_s: s.offset_s ?? 0,
    duration_s: s.duration_s ?? 1,
    volume: s.volume ?? 0.35,
  })),
};
writeFileSync(join(root, "audio_meta.json"), JSON.stringify(meta, null, 2));
console.log(`✓ voice: ${voices.length} lines · ${neutral.total_duration_s}s total → audio_meta.json`);
