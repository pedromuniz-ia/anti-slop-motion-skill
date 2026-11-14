# HyperFrames in practice

HyperFrames renders HTML + GSAP frame by frame in headless Chrome, so the result is deterministic:
the same input produces the same video, and you can jump to any instant. Version used:
`hyperframes@0.8.80`. The CLI has `check`, `snapshot` and `render`, and that is what makes it
possible to look at your own frames.

## Commands

```bash
HYPERFRAMES_SKIP_SKILLS=1 npx --yes hyperframes@0.8.80 init meu-reel --non-interactive --example blank --resolution portrait
npx --yes hyperframes@0.8.80 check
npx --yes hyperframes@0.8.80 snapshot --at 0.5,1.6,2.5,3.2,3.6,4.8 --no-end
npx --yes hyperframes@0.8.80 snapshot stills --at 0.5,1.5,2.5 --no-end
npx --yes hyperframes@0.8.80 render --quality draft --output renders/previa-v1.mp4 .
npx --yes hyperframes@0.8.80 render --quality high --output renders/bruto.mp4 .
```

- `check` combines lint, runtime, layout, motion and contrast. Run it after every scene and do not
  render with errors. `panel_out_of_canvas` warnings (info level) are expected with camera moves.
- `snapshot` writes `snapshots/frame-NN-at-Xs.png` and `contact-sheet.jpg`. Use `--no-end` to capture
  only the requested times and `--zoom <selector|x,y,w,h>` to check the sharpness of a text.
- `render --quality draft` is for the animatic and previews (5 s took 36 s). `--quality high` is for
  the final (36 s took ~6 min).

## Structure

```
meu-reel/
  index.html                      root: assembles scenes, captions and audio
  compositions/frames/01-cena.html   one sub-composition (<template>) per scene
  assets/telas/                   real screens (output of motion.mjs phone, 3x)
  assets/audio/                   narration, sfx.wav
  renders/                        previa-v1.mp4, bruto.mp4, reel-v1.mp4 (never overwrite)
```

Root assembly, tested with the `cena-celular.html` template:

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="5" data-width="1080" data-height="1920">
  <div id="el-01" class="scene" data-composition-id="cena-celular" data-composition-src="compositions/frames/01-cena.html" data-start="0" data-duration="5" data-track-index="1"></div>
  <audio id="el-sfx" src="assets/audio/sfx.wav" data-start="0" data-duration="5" data-track-index="10" data-volume="0.5"></audio>
</div>
<script>
  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = gsap.timeline({ paused: true });
</script>
```

Each sub-composition registers its own paused timeline in `window.__timelines["<id>"]`, with the same
id as its `data-composition-id`. No `Math.random`, `Date.now`, `setTimeout` or CSS transitions:
everything comes from the timeline.

## Camera: think "screen point -> frame point"

Guessing `x/y/scale` does not scale. Describe the shot as "put point P of the screen at point Q of
the frame, with scale s and rotation r":

```js
// rig 473×932 pt with the 393×852 screen at (40,40); (fx, fy) in SCREEN pt; (ax, ay) in px of the 1080×1920 frame
function cam(s, fx, fy, ax, ay, r) {
  r = r || 0;
  var a = (r * Math.PI) / 180, px = 40 + fx, py = 40 + fy;
  return { x: ax - s * (Math.cos(a) * px - Math.sin(a) * py), y: ay - s * (Math.sin(a) * px + Math.cos(a) * py), scale: s, rotation: r, transformOrigin: "0px 0px" };
}
// for a flat image (no device): image point (fx, fy) at (ax, ay)
function look(s, fx, fy, ax, ay) { return { x: ax - s * fx, y: ay - s * fy, scale: s, transformOrigin: "0px 0px" }; }
```

- **Measuring the point:** measure on the screenshot the event, bubble or button the line mentions,
  using the `--probe` pixel scan or by opening the image. The point is the center of what the line
  mentions, slightly higher so the event title fits.
- **Shots that worked in the reel:**
  - Wide at 1.45x, with the device below the title.
  - Close-up at 2.7x, which shows the full width of the screen.
  - Detail at 4.2x, on the ✓✓.
  - A ±2° rotation on close-ups.
  - Cream fade from y 1040, for the caption.
- **Cut to another screen on the same device:**
  - `tl.set` the opacity of both screens at the cut instant.
  - `fromTo` of the rig already framed, with `immediateRender: false`.

## Springs (movement with mass)

Closed-form springs are a pure function of time, so they stay deterministic. Presets:
- `snappy` k320 d30: UI, button.
- `padrao` k170 d26: camera, card. ("padrao" = standard)
- `pesada` k90 d20: big typography, device entrance, no overshoot. ("pesada" = heavy)
- `brincalhona` k220 d14: visible overshoot, only for a mascot or sticker. ("brincalhona" = playful)

```js
var MOLAS = { snappy: [320, 30, 0.5], padrao: [170, 26, 0.7], pesada: [90, 20, 1.0], brincalhona: [220, 14, 0.9] };
function mola(t, k, d) {
  if (t <= 0) return 0;
  var w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) { var wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t)); }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}
function sp(nome) { var m = MOLAS[nome]; return { duration: m[2], ease: function (p) { return p >= 1 ? 1 : mola(p * m[2], m[0], m[1]); } }; }
// usage: tl.to(rig, merge(cam(2.7, 196, 517, 540, 690, -2), sp("padrao")), 2.05);
```

Each preset's duration is the time until the spring settles (≥ 99.9%), so there is no jump at the
end. Exits (something leaving) can stay on `power3.in`.

## Ready-made voice, captions and assembly (`kit/templates/projeto/`)

Copy the scripts to `<project>/scripts/` and the `.exemplo` ("example") files as a starting point
(drop the `.exemplo`):

| File | Does |
|---|---|
| `SCRIPT.md` | One line per scene: `## Line N — name (Frame N)` and the text indented 4 spaces. `{shown\|spoken}` and `[Fish tags]`. |
| `voice.mjs` + `fish-tts.mjs` + `align_words.py` | Fish Audio (free model `s2.1-pro-free`) → `.media/audio/voice/NN.mp3` → per-word timing (faster-whisper) → `audio_meta.json`. |
| `STORYBOARD.md` | `## Frame N — name` with `- duration: X.XXs` and `- src: compositions/frames/NN-name.html`. It is the source of order and durations. |
| `captions-groups.txt` + `captions-mute.json` | Caption blocks (units separated by `·`, keyword marked with `*`) and mute windows in global seconds. |
| `clean-captions.mjs` | Generates `compositions/captions.html` (clean captions, each word at the instant it is spoken). |
| `sfx-cues.json` + `assemble.py` | SFX per scene (`{"1": [["pop", 1.35, 0.16]]}`, files in `.media/audio/sfx/<name>.mp3`) and the assembled `index.html`. |

```bash
pip install faster-whisper
FISH_API_KEY=... node scripts/voice.mjs --voice <voice-id> --lang es
node scripts/clean-captions.mjs
python scripts/assemble.py
```

- The voice comes from [fish.audio](https://fish.audio): pick a voice in the video's language and
  copy its id. The key lives in `.env`/an environment variable, never in the project.
- `{Madrid, 13h.|Madrid, una de la tarde.}` becomes **one** unit in the captions: in
  `captions-groups.txt` it takes a single position (`*Madrid, 13h.`).
- Each scene's duration = speech + 0.3 to 0.5 s. Sum everything and put it at the top of `STORYBOARD.md`.
- `transcript only matches 75%` is almost always whisper hearing "o menu" instead of "um menu": listen
  to the audio before re-recording.
- `mkl_malloc: failed to allocate memory` in whisper means the machine was out of RAM at that moment: run it again.

## Captions

- **Structure:** blocks of 1 to 4 words, each word entering at the time it is spoken (word-by-word
  alignment).
  - A small line, 52 px/700.
  - Big uppercase keyword in the accent color, 92-140 px/800.
- **Reels safe zone:** y 1190-1446 in 1080×1920. It sits outside the app UI (buttons, post caption).
- **Mute windows:** when the scene's typography already shows the sentence ("Terça, 14h.", "11% de
  faltas"), the captions disappear for that stretch. Captions repeating the title are noise.
- **Outline:** the clean version (no outline, brown and orange) looks better on a light background. A
  thick outline only if the background varies a lot.

## Audio

- **SFX:** one cue per visual event, at low volume (0.08-0.18), for example a pop on the arriving
  bubble and a short whoosh on the cut. With no SFX library, use `motion.mjs sfx` and build a single
  `sfx.wav` as the `<audio>` track.
- **Loudness:** `motion.mjs finish` brings it to -14 LUFS with a peak at -1.5 dBTP and copies the video
  without re-encoding.

## Gotchas (all of them happened)

- **Font on the `<template>` root is dropped at assembly.** The text came out in Times. Declare
  `font-family` on each text's class.
- **A repeated `fromTo` on the same element applies the initial state too early.** The phone showed up
  on top of the "86%". Use `tl.set(el, base, 0)` and `immediateRender: false` on the following `fromTo`s.
- **Extreme close-up:** `check` warns `escaped_container`. If it is intentional, mark the rig with
  `data-layout-allow-overflow`.
- **Full-screen overlay visible on the first frame:** lint reports `gsap_fullscreen_overlay_starts_visible`.
  Start at `opacity: 0` and animate with `fromTo`.
- **PNG frame:** goes in with `mix-blend-mode: multiply` and a cut-out screen. The template's CSS one
  needs no file.
- **Screens at 3x or 4x.** The camera reaches 4.2x; a 1x screen is blurry on the close-up.
- **Text that overlaps on a scene change** does not show on the 1-frame-per-second sheet. Use the
  `critique` `tira.jpg` around each cut.
- **Transition and text leaving at the same time:** the text's exit must finish before the next
  element passes over it.
