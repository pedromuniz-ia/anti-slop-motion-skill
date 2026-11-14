# Builds index.html from STORYBOARD.md (order, duration, src), the voices and sfx-cues.json.
import json, re, subprocess
sb = open("STORYBOARD.md", encoding="utf-8-sig").read()
frames = []
for m in re.finditer(r"^## Frame (\d+).*?\n(.*?)(?=^## |\Z)", sb, re.S | re.M):
    body = m.group(2)
    frames.append((int(m.group(1)), float(re.search(r"duration:\s*([\d.]+)s", body).group(1)), re.search(r"src:\s*(\S+)", body).group(1)))
dur = {}
def probe(f):
    if f not in dur:
        dur[f] = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode().strip())
    return dur[f]
start, t = {}, 0.0
parts = []
for n, d, src in frames:
    start[n] = round(t, 3)
    cid = src.split("/")[-1][:-5]
    parts.append(f'      <div id="el-{cid}" class="scene" data-composition-id="{cid}" data-composition-src="{src}" data-start="{start[n]}" data-duration="{d}" data-track-index="1"></div>')
    parts.append(f'      <audio id="el-{cid}-voice" src=".media/audio/voice/{n:02d}.mp3" data-start="{start[n]}" data-duration="{round(min(d, probe(f".media/audio/voice/{n:02d}.mp3")), 3)}" data-track-index="10" data-volume="1"></audio>')
    t += d
total = round(t, 3)
parts.append(f'      <div id="el-captions" class="scene" data-composition-id="captions" data-track-kind="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{total}" data-track-index="2"></div>')
cues = json.load(open("sfx-cues.json"))
k = 0
for fr, arr in cues.items():
    for name, off, vol in arr:
        f = f".media/audio/sfx/{name}.mp3"
        s = round(start[int(fr)] + off, 3)
        d = round(min(probe(f), total - s), 3)
        parts.append(f'      <audio id="el-sfx-{k}" src="{f}" data-start="{s}" data-duration="{d}" data-track-index="{20 + k}" data-volume="{vol}"></audio>')
        k += 1
html = f'''<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js" integrity="sha384-sG0Hv1tP1lZCk9KQmrIbY/XNwi+OY84GQqhMscbnsoBFqAz8KNCil1kvfL3Hbbk2" crossorigin="anonymous"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; }}
      .scene {{ position: absolute; inset: 0; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1080" data-height="1920">
{chr(10).join(parts)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
'''
open("index.html", "w", encoding="utf-8").write(html)
print("index.html", total, "s,", k, "sfx", start)
