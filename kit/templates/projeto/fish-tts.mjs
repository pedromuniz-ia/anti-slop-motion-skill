#!/usr/bin/env node
// Generates narration with the Fish Audio API (S2.1 Pro).
// Usage: FISH_API_KEY=... node scripts/fish-tts.mjs jobs.json
// jobs.json: { "model": "s2.1-pro-free", "voice": "<reference_id>", "defaults": {...}, "lines": [{ "id": "01", "text": "...", "out": ".media/audio/voice/01.mp3" }] }
// The key comes only from the environment; it is never written to the project.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const key = process.env.FISH_API_KEY;
if (!key) {
  console.error("FISH_API_KEY missing from the environment.");
  process.exit(1);
}

const jobsPath = process.argv[2];
if (!jobsPath) {
  console.error("Usage: node scripts/fish-tts.mjs <jobs.json>");
  process.exit(1);
}

const jobs = JSON.parse(await readFile(jobsPath, "utf8"));
const base = dirname(resolve(jobsPath));
const model = jobs.model ?? "s2.1-pro-free";
const only = process.argv.slice(3);

function durationOf(file) {
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    return Number(String(out).trim());
  } catch {
    return NaN;
  }
}

for (const line of jobs.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const body = {
    text: line.text,
    reference_id: line.voice ?? jobs.voice,
    format: "mp3",
    mp3_bitrate: 192,
    normalize: false,
    latency: "normal",
    temperature: 0.7,
    top_p: 0.7,
    ...jobs.defaults,
    ...line.params,
  };

  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model },
      body: JSON.stringify(body),
    });
    if (res.status !== 503 && res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }

  if (!res.ok) {
    console.error(`${line.id}: HTTP ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    continue;
  }

  const out = resolve(base, line.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log(`${line.id}\t${durationOf(out).toFixed(2)}s\t${line.out}`);
}
