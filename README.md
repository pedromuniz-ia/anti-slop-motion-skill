# anti-slop-motion

A Claude Code / agent skill for making motion-design reels and product videos that do not look like "AI slop".

## What it is

`anti-slop-motion` is a skill (`SKILL.md` + references + a small Node kit + HyperFrames templates) that makes an AI agent work like a motion designer instead of a prompt-to-video slot machine: real UI in a realistic phone mockup, a camera that follows the narration, a reference turned into a style guide, a stills board approved before anything moves, a self-critique with scores, and versioned deliveries.

## The problem: AI slop

AI-generated video turns into slop when it shows things that do not exist (UI drawn from imagination, generic icons, a centered gradient title with everything fading in) and when nobody looked at their own frames before delivering. The result is a video that is technically "done" and visibly mid.

## The method

1. **Brief.** Goal, audience, CTA, duration, format, brand. Locked before anything else.
2. **Script and narration.** Short lines, then a per-word timing grid that drives every cut and caption.
3. **Reference -> style guide.** Study a reference video (`ref`) and write down its grammar (rhythm, type, camera), never its content.
4. **Storyboard.** Three variants, someone picks one. The shot list is a list of states, not moods.
5. **Real screens.** Every UI is a real screenshot/recording, a logged-in browser capture or a faithful app kit edited with real text. Nothing is drawn.
6. **Stills board.** One key frame per scene, approved before animating.
7. **Animation.** HyperFrames scenes (HTML + GSAP, deterministic render) with springs, camera moves that point at what the narration says, and a clean `check`.
8. **Critique.** `critique` builds a contact sheet, a 12-frame strip and a phone-size test; score 1-10 and fix the 3 worst problems until everything is ≥ 8.
9. **Preview, director's notes, final.** Draft render with a versioned name, apply notes, then a `high` render, loudness normalization (-14 LUFS), poster and caption.

Full details: [SKILL.md](SKILL.md) and [references/](references/).

## What's in the kit

| Path | What it is |
|---|---|
| `SKILL.md` | The skill: hard rules, gated workflow, gotchas |
| `references/fluxo.md` | The workflow phase by phase (brief, style guide, shot list, critique prompt) |
| `references/telas-reais.md` | How to get real screens, and what does not work |
| `references/hyperframes.md` | HyperFrames in practice: commands, camera, springs, captions, gotchas |
| `kit/motion.mjs` | CLI: `ref`, `phone`, `alpha`, `critique`, `finish`, `sfx`, `receiver` (Node + ffmpeg only) |
| `kit/templates/cena-celular.html` | HyperFrames phone scene (title, iPhone with a real screen, camera, springs, cut) |
| `kit/templates/prancha-stills.html` | Stills board with a "real screen pending" placeholder |
| `kit/templates/chat-scene.mjs` | Generates an animated WhatsApp conversation scene from a JSON |
| `kit/templates/CLAUDE-motion.md` | House rules to paste into a video project's `CLAUDE.md` |
| `kit/templates/projeto/` | Fish Audio voice, per-word alignment, captions and `index.html` assembly scripts, plus example files |

File names such as `folha.jpg`, `cortes.json` or `cena-celular.html` keep their original Portuguese names (sheet, cuts, phone scene).

## Requirements

- **Node.js 18+** and **ffmpeg / ffprobe** on PATH (all `motion.mjs` commands).
- **HyperFrames** ([github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)), run through `npx hyperframes@0.8.80`; it downloads its own headless Chrome.
- **Python 3 + `faster-whisper`** only if you use the voice-alignment scripts in `kit/templates/projeto/` (`pip install faster-whisper`).
- **Optional:** a [Fish Audio](https://fish.audio) API key in the `FISH_API_KEY` environment variable for TTS narration. Never commit it (`.env` is git-ignored).
- **Background music is not included.** If you add music, you are responsible for licensing it. No music is bundled with this repo.

## Install as a Claude Code skill

Copy the whole folder into your skills directory (global, all projects):

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/pedromuniz-ia/anti-slop-motion-skill ~/.claude/skills/anti-slop-motion
node ~/.claude/skills/anti-slop-motion/kit/motion.mjs help
```

Or into `<project>/.claude/skills/anti-slop-motion` for a single project.

Example prompt:

> Make a 30-second vertical reel for a dental clinic showing how an AI assistant answers patients on WhatsApp and reschedules a missed appointment. Use real screenshots in a single iPhone mockup, follow the anti-slop-motion method, show me the stills board before animating, and critique your own frames before sending the preview.

## Results / Resultados

Three reels made with this method: `oi-sem-resposta`, `cadeira-vazia`, `cuida-da-noite`.

Reels made with this skill (narration with Fish Audio, real UI in a phone mockup) / Reels feitos com esta skill:

- [Reel 1](https://www.instagram.com/p/DdzNWVlhR_F/)
- [Reel 2](https://www.instagram.com/p/DdyxU39ht7u/)
- [Reel 3](https://www.instagram.com/p/Dd1QHlShibu/)

## Credits

Created by Pedro Muniz ([@pedromuniz-ia](https://github.com/pedromuniz-ia)). Built on [HyperFrames](https://github.com/heygen-com/hyperframes). Released under the [MIT License](LICENSE).

---

## Português

Uma skill do Claude Code / agentes para criar reels e vídeos de produto em motion design que não parecem "AI slop" (cara de IA).

### O que é

`anti-slop-motion` é uma skill (`SKILL.md` + referências + um kit pequeno em Node + modelos HyperFrames) que faz o agente trabalhar como um motion designer, e não como uma máquina de caça-níquel de prompt para vídeo: interface real dentro de um celular realista, câmera guiada pela narração, referência transformada em guia de estilo, prancha de stills aprovada antes de animar, crítica com nota e entregas versionadas.

### O problema: AI slop

Vídeo de IA vira slop quando mostra o que não existe (UI desenhada de cabeça, ícone genérico, título centralizado em degradê com tudo entrando em fade) e quando ninguém olhou os próprios quadros antes de entregar. O resultado é um vídeo tecnicamente "pronto" e visivelmente medíocre.

### O método

1. **Brief.** Objetivo, público, CTA, duração, formato, marca. Fechado antes de tudo.
2. **Roteiro e narração.** Falas curtas e uma grade de tempo palavra a palavra que comanda cada corte e legenda.
3. **Referência -> guia de estilo.** Estude um vídeo de referência (`ref`) e anote a gramática (ritmo, tipografia, câmera), nunca o conteúdo.
4. **Storyboard.** Três variantes, quem pediu escolhe uma. A lista de planos é uma lista de estados, não de clima.
5. **Telas reais.** Toda interface é print/gravação real, captura de navegador logado ou kit fiel do app editado com texto real. Nada é desenhado.
6. **Prancha de stills.** Um quadro-chave por cena, aprovado antes de animar.
7. **Animação.** Cenas HyperFrames (HTML + GSAP, render determinístico) com molas, câmera que aponta o que a narração diz e `check` limpo.
8. **Crítica.** O `critique` gera folha de quadros, tira de 12 quadros e teste no tamanho do celular; dê nota de 1 a 10 e corrija os 3 piores problemas até tudo ficar ≥ 8.
9. **Prévia, notas de diretor, final.** Render `draft` com nome versionado, aplique as notas, depois render `high`, normalização de loudness (-14 LUFS), capa e legenda.

Detalhes completos: [SKILL.md](SKILL.md) e [references/](references/) (em inglês).

### O que tem no kit

| Caminho | O que é |
|---|---|
| `SKILL.md` | A skill: regras duras, fluxo com portões, pegadinhas |
| `references/fluxo.md` | O fluxo fase a fase (brief, guia de estilo, lista de planos, prompt da crítica) |
| `references/telas-reais.md` | Como conseguir telas reais e o que não funciona |
| `references/hyperframes.md` | HyperFrames na prática: comandos, câmera, molas, legenda, pegadinhas |
| `kit/motion.mjs` | CLI: `ref`, `phone`, `alpha`, `critique`, `finish`, `sfx`, `receiver` (só Node + ffmpeg) |
| `kit/templates/cena-celular.html` | Cena HyperFrames de celular (título, iPhone com tela real, câmera, molas, corte) |
| `kit/templates/prancha-stills.html` | Prancha de stills com marcador de "tela real pendente" |
| `kit/templates/chat-scene.mjs` | Gera a cena de uma conversa de WhatsApp animada a partir de um JSON |
| `kit/templates/CLAUDE-motion.md` | Regras da casa para colar no `CLAUDE.md` do projeto de vídeo |
| `kit/templates/projeto/` | Scripts de voz (Fish Audio), tempo por palavra, legenda e montagem do `index.html`, com arquivos de exemplo |

### Requisitos

- **Node.js 18+** e **ffmpeg / ffprobe** no PATH (todos os comandos do `motion.mjs`).
- **HyperFrames** ([github.com/heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)), executado com `npx hyperframes@0.8.80`; ele baixa o próprio Chrome headless.
- **Python 3 + `faster-whisper`** só se for usar os scripts de alinhamento de voz em `kit/templates/projeto/` (`pip install faster-whisper`).
- **Opcional:** chave de API do [Fish Audio](https://fish.audio) na variável de ambiente `FISH_API_KEY` para narração por TTS. Nunca a commite (o `.env` está no `.gitignore`).
- **Música de fundo não está incluída.** Se usar música, o licenciamento é por sua conta. Nenhuma música acompanha este repositório.

### Instalar como skill do Claude Code

Copie a pasta inteira para o diretório de skills (global, vale para todos os projetos):

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/pedromuniz-ia/anti-slop-motion-skill ~/.claude/skills/anti-slop-motion
node ~/.claude/skills/anti-slop-motion/kit/motion.mjs help
```

Ou em `<projeto>/.claude/skills/anti-slop-motion` para um projeto só.

Exemplo de prompt:

> Faz um reel vertical de 30 segundos para uma clínica odontológica mostrando como a atendente de IA responde pacientes no WhatsApp e remarca uma consulta que seria perdida. Use prints reais num único iPhone, siga o método anti-slop-motion, me mostre a prancha de stills antes de animar e critique seus próprios quadros antes de mandar a prévia.

### Resultados

Os links dos 3 reels no Instagram ficam na seção "Results / Resultados" acima (`oi-sem-resposta`, `cadeira-vazia`, `cuida-da-noite`).

### Créditos

Criado por Pedro Muniz ([@pedromuniz-ia](https://github.com/pedromuniz-ia)). Construído sobre o [HyperFrames](https://github.com/heygen-com/hyperframes). Licença [MIT](LICENSE).
