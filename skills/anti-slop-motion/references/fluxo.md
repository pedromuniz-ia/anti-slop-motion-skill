# A motion designer's workflow, phase by phase

Every phase ends in a **gate**: an artifact someone can look at and approve. Skipping a gate is the
shortest path to the "mid" video that has to be redone. When the request is just "make a reel", go
through the gates anyway; what changes is how deep each one goes, not the order.

Model effort: `medium` by default and for tweaks and re-renders; `high` for the frame critique
(phase 7) and for the showcase piece, where the first 3 seconds carry everything. `xhigh` or `max`
only where a test of yours showed a gain.

---

## 0. Brief

Fill in what the request and the project memory already answer (for example, Reels 1080×1920 and the
house CTA) and ask, in a single message, only what is missing. Do not start without 1 to 4:

1. What the video must cause in whoever watches it, and the action at the end (CTA). E.g. "DM me".
2. Audience and platform (Reels 1080×1920 is the default; 1:1 and 16:9 only if they will be used).
3. Target duration (15-45 s works; 30-40 s to explain a process).
4. Which real screens exist and who has them (the client's app, site, WhatsApp, calendar, profile).
5. Brand: colors (hex), fonts, logo; if there is none, a short palette + one accent color.
6. Voice: narration (TTS or recorded), captions only, or music.

API keys live in `.env` (e.g. `FISH_API_KEY`), never pasted into the prompt or the code.

## 1. Script and narration: the timing grid

- Short sentences, one idea per sentence. The hook lands in the first 2 s.
- The narration produces the **timing grid**: align word by word (whisper or equivalent) and keep
  the times. Cuts, close-ups and caption keywords land on those times.
- With no narration, the grid is the music: measure the beats and put state changes on the beats and
  SFX on the peaks. The HyperFrames CLI lists a `beats` command for this (not tested in this kit).

## 2. Reference -> style guide

Without a reference, the model falls back to the default (centered text, gradient, fade). With a
reference, it copies rhythm, typography and transitions.

```bash
node "$SKILL/kit/motion.mjs" ref refs/referencia.mp4 --out refs/quadros
```

Reference sources: whatships.com (launch videos), motion work on Dribbble, competitors' launch films,
or the client's own library. Pick 3-4 and write `docs/style_guide.md`:

```
Reference: refs/<file> (frames in refs/quadros/, cuts in refs/quadros/cortes.json)
- Palette (hex) and where each color appears
- Typography: family, weight, tracking; how text enters and leaves
- Rhythm: average duration per shot (from cortes.json), where it speeds up
- Camera: push-in, pan, hard cut, match cut; when each one
- Transitions between scenes
- Texture/grain, shadow, depth
- What NOT to take: content, logos, characters (take the grammar, never the content)
```

Show the guide and wait for the OK before any code. If it is rejected, rewrite the guide, not the code.

## 3. Storyboard in 3 variants

Same script, three directions different enough that choosing is easy. In the clinic reel they were:
A "clean, Apple-style" (cream background, big type, calm camera), B "bold" and C "documentary".
Each variant lists the scenes in one line and names the reference it follows. Whoever asked picks
one; the pick becomes `STORYBOARD.md`.

### The shot list as a list of states

Do not describe the mood; describe the state of each thing on each beat. One line per shot (the
voiceover lines below are Brazilian Portuguese demo content: "Tuesday, 2 PM." / "The chair is ready." /
"The patient doesn't show up."):

| t (s) | line | real screen + state | camera | on-screen text | caption | SFX |
|------|------|---------------------|--------|----------------|---------|-----|
| 0.0-2.0 | "Terça, 14h." | Calendar: Tuesday, Maria 14:00 (before) | phone rises, wide shot | "Terça, 14h." | muted (the type already says it) | whoosh 0.0 |
| 2.0-3.7 | "A cadeira tá pronta." | same | close-up on the 2 PM event, -2° | — | "A cadeira TÁ PRONTA." | whoosh 2.05 |
| 3.7-5.3 | "O paciente não vem." | WhatsApp: Maria, gray ✓✓ | cut, close-up on the ✓✓ | — | "O paciente NÃO VEM." | pop 3.98 |

Rules: something new every 2-4 s; text inside an element that changes enters after the change starts
and leaves before the next one; the last frame sets up the first if the video loops.

## 4. Inventory and collection of real screens

One line per screen: scene, app, state (before/after), source (kit, client screenshot, browser,
API), owner, status. Everything that depends on the client goes out in a single message, with a
step-by-step they can follow without thinking. See [telas-reais.md](telas-reais.md).

While a screen has not arrived, it goes in as a **striped placeholder** on the board and in the
preview (the `prancha-stills.html` template has `data-todo`). Never replace it with a "temporary"
drawn version that ends up staying.

## 5. Stills board

One key frame per scene, before animating. Use `kit/templates/prancha-stills.html` as the
`index.html` of a separate project (e.g. `<reel>/stills/`), one still per second:

```bash
npx --yes hyperframes@0.8.80 snapshot stills --at 0.5,1.5,2.5 --no-end
```

The sheet comes out at `stills/snapshots/contact-sheet.jpg`. Approve composition, device size,
caption space (band y 1190-1446 in 1080×1920) and hierarchy before any movement.

## 6. Animation

Each scene becomes a sub-composition (`compositions/frames/NN-name.html`), assembled in `index.html`.
Start from `kit/templates/cena-celular.html`. Camera with a reason, springs, hard cuts on the same device.
Run `check` after every scene. Details in [hyperframes.md](hyperframes.md).

## 7. Critique with a score

Render (a `draft` preview is enough) and build the material:

```bash
node "$SKILL/kit/motion.mjs" critique renders/previa-v1.mp4 --out critica --at 3.6 --poster 2.9
```

Open `critica/folha.jpg`, `critica/tira.jpg` and `critica/celular.jpg` and really look. Be a
demanding motion director, not a proud author:

```
Scores from 1 to 10: hook in the first 2 seconds · readability at phone size · quality of
movement (springs, no dead frame) · variety (something new every 2-4 s) · composition · fidelity
to the brand and the real screens · sync with speech/sound.

List the 3 biggest problems with timestamps. Hunt specifically for: overlapping text during a
change, things sliding instead of settling, a label or border in the corners, a centered gradient
title, text blurred by scaling, a dead beat, an invented screen, a time/name that is inconsistent
between scenes.

Fix, re-render only what is needed, run the critique again and log it in docs/review_log.md.
Repeat until all scores are ≥ 8.
```

A real example the strip caught: in the clinic reel, at 11.8-11.9 s the phone rises while "86% /
still confirm through WhatsApp" is still leaving, and the text passes over the screen for about 3
frames. The 1-frame-per-second sheet does not show it; the 12-consecutive-frame strip does.

## 8. Preview and director's notes

- Render the preview in `draft` with a versioned name (`renders/previa-v1.mp4`) and deliver it.
- Ask for objective notes: "cut earlier here", "slower camera on the zoom", "hold longer on the list".
- Read what the client meant, not just the word. "I missed the cap... the phone mockup" meant "the
  phone frame in the preview", not "the caption". When in doubt, show frames and ask.
- Apply, version (`v2a`, `v2b`), keep the previous ones. If the client prefers an older version, it
  has to exist.

## 9. Final

```bash
npx --yes hyperframes@0.8.80 render --quality high --output renders/bruto.mp4 .
node "$SKILL/kit/motion.mjs" finish renders/bruto.mp4 renders/reel-v1.mp4 --lufs -14
node "$SKILL/kit/motion.mjs" critique renders/reel-v1.mp4 --out critica-final --poster 2.9
```

Deliver: the final MP4, the poster (`capa.png`, pick a frame that explains itself in the grid), the
frame sheet and the post caption ready to paste. Say what you would improve next time.
Library music (Instagram/TikTok) goes in inside the app: 15-20% volume, original audio at 100%.

## Optional: multiple formats

If the video goes to 9:16, 1:1 and 16:9, write the scenes against a layout function (w, h), not in
fixed pixels, and reframe typography and UI per format. Never crop a 16:9 to vertical.
