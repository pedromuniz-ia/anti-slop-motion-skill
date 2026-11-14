#!/usr/bin/env node
// Generates a HyperFrames WhatsApp-conversation scene inside the mockup iPhone.
// Usage (project root): node scripts/chat-scene.mjs scenes/02-manha.json
// Config: { id, dur, prefix, chrome, items: [{ key, x, y, w, h, at?, side? }], cams: [[t, dur, ease, s, fx, fy, ax, ay, r]], rise? }
//  - items: final positions on the 393×852 screen (Figma output); `at` = instant the bubble arrives (without `at`, it is already there).
//  - the stack rises on its own: the last visible bubble always sits flush with the typing bar (y 767).
//  - cams[0] is the initial framing (set at 0); the following ones are moves.
import { readFileSync, writeFileSync } from "node:fs";

const c = JSON.parse(readFileSync(process.argv[2], "utf8"));
const P = c.prefix;
const BOTTOM = 767;
const bottomOf = (it) => it.y + it.h;
const initial = c.items.filter((it) => it.at == null);
const arrivals = c.items.filter((it) => it.at != null).sort((a, b) => a.at - b.at);
let last = Math.max(...initial.map(bottomOf));
const offsets = [[0, BOTTOM - last]];
for (const it of arrivals) {
  last = Math.max(last, bottomOf(it));
  offsets.push([it.at, BOTTOM - last]);
}

// initial framing already in the rig style: without it, the first frame of the scene comes out without the camera
function camCss(s, fx, fy, ax, ay, r = 0, dy = 0) {
  const a = (r * Math.PI) / 180, px = 40 + fx, py = 40 + fy;
  const x = ax - s * (Math.cos(a) * px - Math.sin(a) * py), y = ay - s * (Math.sin(a) * px + Math.cos(a) * py) + dy;
  return `transform: translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r}deg) scale(${s})`;
}
const rigStyle = camCss(...c.cams[0].slice(3), c.rise || 0);
const img = (it) =>
  `<img class="${P}-item" id="${P}-${it.key}" src="assets/ui/${it.key}.png" style="left: ${it.x}px; top: ${it.y}px; width: ${it.w}px; height: ${it.h}px${it.at != null ? "; opacity: 0" : ""}" alt="" />`;

const html = `<template>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&display=block");
    [id="${P}-bg"] { position: absolute; inset: 0; background: #fbf6ef; }
    [id="${P}-stage"] { position: absolute; inset: 0; }
    [id="${P}-rig"] { position: absolute; left: 0; top: 0; width: 473px; height: 932px; transform-origin: 0 0; }
    [id="${P}-ph"] { position: absolute; inset: 0; isolation: isolate; filter: drop-shadow(0 26px 40px rgba(22, 18, 16, 0.2)); }
    [id="${P}-scr"] { position: absolute; left: 40px; top: 40px; width: 393px; height: 852px; border-radius: 56px; overflow: hidden; background: #fff; }
    [id="${P}-scr"] img.${P}-full { position: absolute; left: 0; top: 0; width: 393px; height: 852px; }
    [id="${P}-frm"] { position: absolute; inset: 0; background: url("assets/ui/iphone-raw1.png") 0 0 / 473px 932px no-repeat; mix-blend-mode: multiply; }
    .${P}-clip { position: absolute; left: 0; top: 98px; width: 393px; height: 677px; overflow: hidden; }
    .${P}-stack { position: absolute; left: 0; top: -98px; width: 393px; height: 852px; }
    .${P}-item { position: absolute; }
    [id="${P}-call"] { position: absolute; left: 0; right: 0; top: 250px; display: flex; justify-content: center; opacity: 0; }
    .${P}-pill { position: relative; display: inline-flex; align-items: center; gap: 22px; padding: 26px 44px; border-radius: 999px; background: #fffdf9; box-shadow: 0 18px 40px rgba(22, 18, 16, 0.18); font-family: "Hanken Grotesk", sans-serif; font-size: 40px; font-weight: 700; letter-spacing: -0.02em; color: #161210; white-space: nowrap; }
    .${P}-dot { width: 22px; height: 22px; border-radius: 50%; background: #ff4d17; flex: none; }
    .${P}-txt { position: relative; }
    [id="${P}-t2"] { position: absolute; left: 0; top: 0; opacity: 0; }
    .${P}-o { color: #ff4d17; }
    [id="${P}-fade"] { position: absolute; left: 0; right: 0; top: 1040px; bottom: 0; background: linear-gradient(to bottom, rgba(251, 246, 239, 0) 0px, #fbf6ef 170px); }
  </style>

  <div id="${P}-root" data-composition-id="${c.id}" data-start="0" data-duration="${c.dur}" data-width="1080" data-height="1920">
    <div id="${P}-bg" class="clip" data-start="0" data-duration="${c.dur}" data-track-index="0"></div>
    <div id="${P}-stage" class="clip" data-start="0" data-duration="${c.dur}" data-track-index="1">
      <div id="${P}-rig" style="${rigStyle}" data-layout-allow-overflow>
        <div id="${P}-ph">
          <div id="${P}-scr">
            <img class="${P}-full" src="assets/ui/${c.chrome}.png" alt="" />
            <div class="${P}-clip">
              <div class="${P}-stack" id="${P}-stack">
                ${c.items.map(img).join("\n                ")}
              </div>
            </div>
          </div>
          <div id="${P}-frm"></div>
        </div>
      </div>
      <div id="${P}-fade"></div>${c.callout ? `
      <div id="${P}-call"><div class="${P}-pill"><span class="${P}-dot" id="${P}-dot"></span><span class="${P}-txt"><span id="${P}-t1">${c.callout.a}</span><span id="${P}-t2">${c.callout.b}</span></span></div></div>` : ""}
    </div>
  </div>

  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
      var $ = function (id) { return document.getElementById(id); };
      function merge(a, b) { var o = {}; for (var k in a) o[k] = a[k]; for (var k2 in b) o[k2] = b[k2]; return o; }
      // iPhone camera (rig 473×932, screen at 40,40): puts screen point (fx, fy) at (ax, ay) of the frame
      function cam(s, fx, fy, ax, ay, r) {
        r = r || 0;
        var a = (r * Math.PI) / 180, px = 40 + fx, py = 40 + fy;
        return { x: ax - s * (Math.cos(a) * px - Math.sin(a) * py), y: ay - s * (Math.sin(a) * px + Math.cos(a) * py), scale: s, rotation: r, transformOrigin: "0px 0px" };
      }
      var rig = $("${P}-rig"), stack = $("${P}-stack");
      var CAMS = ${JSON.stringify(c.cams)};
      var first = cam.apply(null, CAMS[0].slice(3));
      ${
        c.rise
          ? `tl.fromTo(rig, merge(first, { y: first.y + ${c.rise} }), merge(first, { duration: 0.7, ease: "power3.out" }), 0);`
          : `tl.set(rig, first, 0);`
      }
      CAMS.slice(1).forEach(function (k) {
        tl.to(rig, merge(cam.apply(null, k.slice(3)), { duration: k[1], ease: k[2] }), k[0]);
      });
      // the message stack rises when a new one arrives
      var OFF = ${JSON.stringify(offsets)};
      tl.set(stack, { y: OFF[0][1] }, 0);
      OFF.slice(1).forEach(function (o) { tl.to(stack, { y: o[1], duration: 0.3, ease: "power3.out" }, o[0]); });
      var ARR = ${JSON.stringify(arrivals.map((it) => [it.key, it.at, it.side || "fr"]))};
      ARR.forEach(function (a) {
        tl.fromTo($("${P}-" + a[0]), { opacity: 0, y: 26, scale: 0.97, transformOrigin: a[2] === "me" ? "100% 100%" : "0% 100%" }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out" }, a[1]);
      });
      ${c.callout ? `var CL = ${JSON.stringify(c.callout)};
      tl.fromTo($("${P}-call"), { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, CL.in);
      tl.fromTo($("${P}-dot"), { scale: 1 }, { scale: 0.6, duration: 0.3, ease: "sine.inOut", repeat: 3, yoyo: true }, CL.in);
      tl.to($("${P}-t1"), { opacity: 0, duration: 0.15, ease: "none" }, CL.swap);
      tl.fromTo($("${P}-t2"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, CL.swap);
      tl.to($("${P}-call"), { opacity: 0, y: -30, duration: 0.3, ease: "power3.in" }, CL.out);` : ""}
      window.__timelines = window.__timelines || {};
      window.__timelines["${c.id}"] = tl;
    })();
  </script>
</template>
`;
writeFileSync(`compositions/frames/${c.id}.html`, html);
console.log(`✓ ${c.id}: ${c.items.length} items, ${arrivals.length} arrivals, offsets ${JSON.stringify(offsets)}`);
