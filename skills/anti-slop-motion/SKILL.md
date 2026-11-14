---
name: anti-slop-motion
description: >-
  Motion-designer method for reels and product videos that do not look like "AI slop":
  real UI (never invented) inside a realistic phone mockup, narration-driven camera,
  reference -> style guide -> shot list, a stills board before animating, self-critique
  with a score, director's notes and versioned deliveries. Ships a kit (Node + ffmpeg)
  that fits real screenshots into an iPhone, studies the reference, builds the critique
  material, synthesizes SFX and normalizes audio, plus HyperFrames templates for the
  phone scene and the stills board. Use when creating, animating, assembling, reviewing
  or rendering a reel, product video, launch video, motion graphics, phone-mockup video,
  "video showing the app/WhatsApp/calendar", or when something "looks like AI" / looks
  like AI slop. Also: make a reel, product/launch video, motion graphics, phone mockup
  video, anti-slop motion. Gatilhos em PT-BR: reel, vídeo de produto, cara de IA.
---

# Anti-slop motion

AI video turns into slop when it shows things that do not exist (UI drawn from imagination, generic
icons, a centered gradient title with everything fading in) and when nobody looked at their own
frames before delivering. This is a motion designer's workflow: real visual proof, gated planning,
critique with a score, and iteration with whoever asked for the video.

`$SKILL` = the folder of this skill (e.g. `~/.claude/skills/anti-slop-motion`). The kit only needs
**Node 18+ and ffmpeg** on PATH. The scene templates use **HyperFrames** (HTML + GSAP with
deterministic rendering via `npx hyperframes@0.8.80`), but the method works with any tool.

Note: file and output names inside the kit (`folha.jpg`, `tira.jpg`, `celular.jpg`, `capa.png`,
`cortes.json`, `cena-celular.html`, `prancha-stills.html`...) keep their original Portuguese names
so existing projects and templates keep working. Meaning: folha = contact sheet, tira = strip,
celular = phone test, capa = poster/cover, cortes = cuts, prancha = board.

## First: the kit (do not rewrite it)

Run from the root of the video project. Every command below was run this way:

```bash
node "$SKILL/kit/motion.mjs" help
node "$SKILL/kit/motion.mjs" ref refs/referencia.mp4 --out refs/quadros
node "$SKILL/kit/motion.mjs" phone capturas/print-agenda.jpg --probe
node "$SKILL/kit/motion.mjs" phone capturas/print-agenda.jpg --clear-top 112 --statusbar assets/ui/barra-1358.png --out assets/telas/agenda.png
node "$SKILL/kit/motion.mjs" alpha assets/ui/export-preto.png assets/ui/export-branco.png assets/ui/export.png
node "$SKILL/kit/motion.mjs" sfx assets/audio/deixas.json assets/audio/sfx.wav
node "$SKILL/kit/motion.mjs" critique renders/previa-v1.mp4 --out critica --at 3.6 --poster 2.9
node "$SKILL/kit/motion.mjs" finish renders/bruto.mp4 renders/reel-v1.mp4 --lufs -14
node "$SKILL/kit/motion.mjs" receiver --dir capturas --port 8787
```

- `ref`: reference frames every 0.5 s + `folha.jpg` + `cortes.json` (cuts, average shot length, biggest changes).
- `phone`: real screenshot -> the mockup iPhone screen (393×852 pt at 3x = 1179×2556), with the screenshot's status bar replaced by an iPhone one. `--probe` shows the top bands and suggests `--clear-top`.
- `alpha`: exact transparency from an opaque export (the same frame exported over black and over white).
- `critique`: `folha.jpg`, `tira.jpg` (12 consecutive frames starting at `--at`: catches overlaps and "jumps"), `celular.jpg` (readability at 360 px), `capa.png` + duration and loudness.
- `finish`: 2-pass loudnorm; **refuses to overwrite** a delivery (version it).
- `sfx`: click, pop, whoosh, thump, chime and tick synthesized from `[{"t":0.4,"type":"pop","gain":0.8}]`.
- `receiver`: local page with `<input type=file>` that saves whatever arrives into `--dir` (capture from a logged-in browser).

Templates: `kit/templates/cena-celular.html` (HyperFrames scene: title, iPhone with a real screen,
camera and springs, cut to another screen on the same device), `kit/templates/prancha-stills.html`
(one key frame per scene, with a "real screen pending" marker), `kit/templates/chat-scene.mjs`
(generates an animated WhatsApp conversation scene from a JSON of bubbles and cameras) and
`kit/templates/CLAUDE-motion.md` (house rules to paste into the project's `CLAUDE.md`). Voice
(Fish Audio), per-word timing, captions and `index.html` assembly: `kit/templates/projeto/` (how to
use it in [references/hyperframes.md](references/hyperframes.md)).

## Hard rules

1. **No invented screens.** All UI is real: a screenshot or recording of the app, a capture from a
   logged-in browser, or a faithful app kit (Figma Community) edited with real text. No "lookalike"
   chat, card, dashboard or icon drawn in div/SVG.
2. **One device, one frame.** If the story happens on a phone, every screen goes into the same
   iPhone. A loose desktop screen breaks the sense that everything happens on one device.
3. **Real, coherent data.** Create the data for real (a calendar event, a real profile) and capture
   before and after. Names, times and the status-bar clock match across scenes (13:58 before the
   2 PM appointment; 18:07 after the 6 PM rescheduling).
4. **Camera with a reason.** Every move points at what the narration says at that moment (close-up on
   the ✓✓ when it says "doesn't show up"; close-up on the time when it says "2 PM"). Decorative
   movement is slop.
5. **Banned clichés:** centered gradient title, everything fading in, labels and borders in the
   corners, glow on UI, generic particles, elastic easing, emoji standing in for icons.
6. **Typographic discipline:** one title family and one UI family, a single accent color on the
   keyword only. Captions disappear when the scene's typography already shows the sentence.
7. **Movement with mass:** springs instead of curves (no overshoot on text, minimal on UI) and
   something new on screen every 2-4 s.
8. **Sound serves the cut:** discreet SFX on the visual event (pop on the bubble, short whoosh on the
   cut); final mix at -14 LUFS.
9. **Look at your own frames before showing anything:** stills board before animating; critique with
   a score afterwards; fix the 3 worst problems until every score is ≥ 8.
10. **Never delete a delivered preview.** Version it (`v1`, `v2a`, `v2b`): the client may prefer an earlier version, and it has to exist.

## Gated workflow

| # | Phase | Output | Gate (do not advance without it) |
|---|-------|--------|----------------------------------|
| 0 | Brief | goal, audience, CTA, duration, format, brand | CTA and duration locked |
| 1 | Script + narration | short lines + per-word timing | the timing grid exists |
| 2 | Reference | `ref` -> `docs/style_guide.md` | grammar annotated (never the content) |
| 3 | Storyboard | 3 variants -> a pick | whoever asked picked one |
| 4 | Real screens | per-scene inventory + collection | every scene has a real source (or a marker) |
| 5 | Stills board | 1 frame per scene | composition approved |
| 6 | Animation | HyperFrames scenes, clean `check` | `check` with no errors |
| 7 | Critique | `critique` + scores 1-10 | all ≥ 8 |
| 8 | Preview + director's notes | `draft` render, named version | notes applied |
| 9 | Final | `high` render -> `finish` -> poster + caption | loudness and frames checked |

Details of each phase, with templates for the brief, style guide, shot list and the critique prompt:
[references/fluxo.md](references/fluxo.md).
How to get each kind of real screen (Figma kits, the client's phone screenshot, logged-in browser,
data via API) and what does NOT work: [references/telas-reais.md](references/telas-reais.md).
HyperFrames in practice (commands, camera, springs, captions, gotchas):
[references/hyperframes.md](references/hyperframes.md).

## Taking it to another environment

The skill is this entire folder (no npm dependencies). To use it on another machine or hand it to
someone else, copy the `skills/anti-slop-motion` folder of https://github.com/pedromuniz-ia/anti-slop-motion-skill into `~/.claude/skills/` (applies to every project) or
into `<project>/.claude/skills/` (that project only), then check:

```bash
node "$SKILL/kit/motion.mjs" help
```

Without a shell (a chat with no terminal), the method and references still apply, but the kit and
the render need an environment with Node, ffmpeg and Chrome (HyperFrames downloads its own).

## Gotchas that cost hours

- **Styles on the `<template>` root vanish at assembly.** A `font-family` set only on the root renders
  in a serif (Times). Put the font on each text's class.
- **A repeated `fromTo` on the same element leaks into the start.** `tl.set` the base state at 0 and
  use `immediateRender: false` on the following `fromTo`s. Without it, the phone showed up on top of
  the "86%".
- **The first frame of each scene comes out without the camera.** At the cut, the phone shows up for
  one frame in the corner, small, before the `tl.set` takes effect. Write the initial framing in the
  rig's `style` (`transform: translate(...) rotate(...) scale(...)`, with the same numbers as `cam()`),
  or `translate(0, 3000px)` if it enters later. The `critique` `tira.jpg` around the cut shows this.
- **Extreme close-ups raise an `escaped_container` warning.** It is intentional: mark the rig with
  `data-layout-allow-overflow`.
- **The Google Calendar website is useless for phone screens.** It is not responsive at 393 px, and
  `/calendar/u/0/m` falls back to the old mobile version (`/gp`, a 2010 look with the e-mail
  exposed). Use a screenshot of the app.
- **The Figma kit exports opaque.** With `download_assets` at scale 4, the background comes out gray.
  Export over black and over white and run `alpha`.
- **A 1080×2340 Android screenshot has the same aspect ratio as the mockup's iPhone screen** (2.167 vs
  2.168). It fits with no cropping: just clear the status bar (`--probe`, then `--clear-top`).
- **A hard cut between identical backgrounds barely shows in detection.** From cream to cream, the
  change score stays below 0.3. `ref` uses 0.15 as the threshold and lists the biggest changes anyway.
- **`high` rendering is slow** (36 s of video took ~6 min). Use `--quality draft` for the animatic and
  previews (5 s in ~36 s) and only go `high` at the end.
