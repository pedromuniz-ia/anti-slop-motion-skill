# Motion rules for this project (paste into the video folder's CLAUDE.md)

Method: skill `anti-slop-motion`. Kit: `node ~/.claude/skills/anti-slop-motion/kit/motion.mjs help`.

## Render contract
- The video is a pure function of time (one paused GSAP timeline per scene, HyperFrames). No Math.random,
  Date.now, setTimeout, requestAnimationFrame or CSS transitions.
- `npx --yes hyperframes@0.8.80 check` clean before any render.
- Preview with `--quality draft`, final with `--quality high`, audio through `motion.mjs finish` (-14 LUFS).
- Deliveries versioned in `renders/` (v1, v2a...). Never delete or overwrite a delivery.

## Screens
- Real interface only: app screenshot/recording, logged-in browser, or a faithful kit edited with real text.
- Every phone screen goes inside the same iPhone (template `cena-celular.html`), recorded at 3x or more.
- Coherent data across scenes (names, times, status-bar clock).
- A screen that has not arrived yet = a striped placeholder, never a drawn version.

## Visual
- Banned: centered gradient title, everything fading in, labels/borders in the corners, glow on UI,
  generic particles, elastic easing, emoji as icons.
- One title family, one UI family, a single accent color on the keyword only.
- Camera only with a reason: every move points at what the line says at that moment.
- Springs (snappy/padrao/pesada) instead of curves; no overshoot on text.
- Something new on screen every 2-4 s.

## Before showing anything
1. `motion.mjs critique <preview> --at <each cut>`; open the sheet, strip and phone test.
2. Score 1-10 on: hook, phone readability, motion, variety, composition, fidelity, sync.
3. Fix the 3 worst, log it in docs/review_log.md, repeat until all are ≥ 8.
