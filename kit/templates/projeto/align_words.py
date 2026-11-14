"""Per-word timing for Fish Audio narration.

Transcribes each audio file with faster-whisper (per-word timestamps) and transfers the
times to the EXACT script text, which is what the captions show.

Script syntax:
  {22h47|vinte e duas e quarenta e sete}  -> captions show "22h47", the voice says the rest
  [pause] / [calm tone]                   -> Fish tags; they vanish from the captions

Usage: python scripts/align_words.py jobs.json out.json [--model small]
jobs.json: {"lines": [{"id": "01", "text": "...", "out": "caminho/01.mp3"}]}
"""

import argparse
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

from faster_whisper import WhisperModel

SEG_RE = re.compile(r"\{([^|{}]+)\|([^{}]+)\}|\[[^\]]*\]|(\S+)")


def norm(word):
    word = unicodedata.normalize("NFKD", word.lower())
    word = "".join(c for c in word if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", word)


def script_units(text):
    """Returns display units, each with the spoken tokens that produce it."""
    units = []
    for m in SEG_RE.finditer(text):
        if m.group(1) is not None:
            spoken = [t for t in m.group(2).split() if norm(t)]
            units.append({"text": m.group(1).strip(), "spoken": spoken})
        elif m.group(3) is not None:
            tok = m.group(3)
            units.append({"text": tok, "spoken": [tok] if norm(tok) else []})
    # stray punctuation ("—", "…") sticks to the previous unit
    merged = []
    for u in units:
        if not u["spoken"] and merged:
            merged[-1]["text"] += " " + u["text"]
        else:
            merged.append(u)
    return merged


def spoken_text(text):
    """Text as sent to TTS, without display overrides (for reference only)."""
    return SEG_RE.sub(lambda m: m.group(2) if m.group(1) else m.group(0), text)


def align(units, heard):
    """heard: [(word, start, end)] from whisper. Returns units with start/end."""
    flat = []  # (unit_index, token)
    for i, u in enumerate(units):
        for tok in u["spoken"]:
            flat.append((i, norm(tok)))
    a = [t for _, t in flat]
    b = [norm(w) for w, _, _ in heard]
    times = [None] * len(flat)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for block in sm.get_matching_blocks():
        for k in range(block.size):
            _, s, e = heard[block.b + k]
            times[block.a + k] = (s, e)

    # interpolate gaps in proportion to word length
    n = len(flat)
    total_end = heard[-1][2] if heard else 0.0
    i = 0
    while i < n:
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < n and times[j] is None:
            j += 1
        left = times[i - 1][1] if i > 0 else (heard[0][1] if heard else 0.0)
        right = times[j][0] if j < n else total_end
        span = max(right - left, 0.05 * (j - i))
        weights = [max(len(flat[k][1]), 1) for k in range(i, j)]
        acc = left
        for k, w in zip(range(i, j), weights):
            dur = span * w / sum(weights)
            times[k] = (acc, acc + dur)
            acc += dur
        i = j

    out = []
    for idx, u in enumerate(units):
        ks = [k for k, (ui, _) in enumerate(flat) if ui == idx]
        if not ks:
            continue
        out.append({"text": u["text"], "start": round(times[ks[0]][0], 3), "end": round(times[ks[-1]][1], 3)})
    for k, w in enumerate(out):
        w["id"] = f"w{k}"
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("out")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default="pt")
    args = ap.parse_args()

    jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))
    base = Path(args.jobs).resolve().parent
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    result = {}
    for line in jobs["lines"]:
        audio = (base / line["out"]).resolve()
        segments, info = model.transcribe(str(audio), language=args.lang, word_timestamps=True, beam_size=5)
        heard = [(w.word.strip(), w.start, w.end) for seg in segments for w in seg.words]
        units = script_units(line["text"])
        words = align(units, heard)
        hypothesis = " ".join(w for w, _, _ in heard)
        ratio = difflib.SequenceMatcher(
            a=[norm(t) for u in units for t in u["spoken"]], b=[norm(w) for w, _, _ in heard], autojunk=False
        ).ratio()
        result[line["id"]] = {"duration_s": round(info.duration, 3), "words": words, "heard": hypothesis, "match": round(ratio, 3)}
        print(f"{line['id']}\t{info.duration:.2f}s\tmatch={ratio:.2f}\t{hypothesis}", flush=True)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
