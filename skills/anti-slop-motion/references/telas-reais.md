# Real screens: where to get them, how to fit them, what does not work

The rule is simple and non-negotiable: **every interface that appears really exists.** This is the
order of preference, from the most real to the least:

1. **The real app, with real data** (a screenshot or recording of the client's screen).
2. **Logged-in browser** (a web app captured in the user's own session).
3. **Faithful app kit** (Figma Community) edited with the story's real text.
4. Never: redrawing the screen from imagination in HTML/SVG, even as a "temporary" version.

For each screen, note in the inventory: scene, app, state (before/after), source, who provides it, status.

---

## Real data, before and after states

If the story shows a change (the AI rescheduled the appointment, the slot was filled), **create the
real data and capture both states** instead of editing the screenshot:

- Create a demo calendar/account (e.g. a "Clínica Demo" calendar with fictional patients). Through
  the Google Calendar connector you can create, move and list events; creating the calendar itself is
  up to the user.
- Capture the **before**, change the data through the API and capture the **after**. To "remove" an
  event without deleting it, park it on a distant date and bring it back later (deleting is
  irreversible).
- Names, times and the status-bar clock must tell the same story in every scene.
- When you finish, return the account to the state the user knows and say what that is.

## 1. The client's phone screenshot (the most real)

When there is no faithful version of the screen (e.g. the Google Calendar app), ask for the
screenshot. The client agrees if the step-by-step comes ready to follow. Send it like this, in a
single message (the sample message below is in Portuguese because the clients are Brazilian):

```
Preciso de 2 prints do app <App> no seu celular (1 minuto):
1. Modo claro. No menu ☰, deixe marcada só a agenda "<Demo>" (desmarque as pessoais).
2. No ☰, escolha "Dia". Vá para <terça, 29/09> e role até a consulta das 9h ficar no alto.
3. Tire o print: iPhone = botão lateral + aumentar volume; Android = ligar + diminuir volume.
   Tem que aparecer <João Pedro às 14h>.
4. Suba no Google Drive (abrir o print → compartilhar → Drive) e me mande "foi".
Depois do "foi" eu mudo a agenda e você tira o segundo, igual.
```

(In short: light mode, only the demo calendar checked, "Day" view on the right date, take the
screenshot with the specific event visible, upload to Drive and reply "done"; after that the
calendar is changed and the client takes the second one the same way.)

If they ask "what do you mean?", repeat only the next step, shorter, with what should appear on screen.

**Fetching the file:**
- With Google Drive for Desktop, Drive shows up mounted on the PC (on Windows, `G:\Meu Drive\`).
  Copy straight from there.
- To find the name, use the Drive connector's search. Samsung screenshots are named
  `Screenshot_YYYYMMDD_HHMMSS_<App>.jpg`.
- Avoid downloading through the Drive connector: it returns the file as base64 inside the context.

**Fitting it into the mockup iPhone:**

```bash
node "$SKILL/kit/motion.mjs" phone capturas/print-agenda.jpg --probe
node "$SKILL/kit/motion.mjs" phone capturas/print-agenda.jpg --clear-top 112 --statusbar assets/ui/barra-1358.png --out assets/telas/agenda.png
```

- **Aspect ratio:** a 1080×2340 Android has the same ratio as the iPhone 15 Pro screen (2.167 vs
  2.168). The app stays in place and only the status bar changes.
- **Status bar:** `--probe` lists the "ink" bands at the top; the first is the Android status bar and
  `--clear-top` clears up to the middle of the next gap. The iPhone bar (time, signal, battery) comes
  from a PNG exported from an iOS kit and can be opaque or transparent. Use the scene's time.
- **Frame:** the mockup's Dynamic Island covers the top center, so check that the app's header is
  not hidden under it. Build a test frame, or use the board.

**Privacy:**
- Personal calendars unchecked, and no one else's notifications in the screenshot.
- The original status bar disappears (it had WhatsApp and Telegram icons and the battery at 10%).
- The profile picture in the app's corner is the client's own; fine if the content is theirs.
- Never type the user's password.

## 2. Logged-in browser (web apps)

Works for anything with a good web version at the width it will appear (desktop, dashboard, site).
With Claude in Chrome:

- **Taking the browser capture:**
  - The screenshot's `save_to_disk` may not return a path. Start a local receiver
    (`motion.mjs receiver --dir capturas`) and open `http://127.0.0.1:8787` in a tab.
  - Send the screenshot with `upload_image` to that page's `<input type=file>`.
  - If the `change` event does not fire, do the POST through `javascript_tool`:
    `fetch("/save?name=x.png", {method: "POST", body: file})`.
- **High resolution of a region:** `document.body.style.zoom = "2.2"` and capture in parts.
- **Google Calendar grid:** the scrolling container is `div.mDPmMe`, at 48 px per hour (scrollTop 600 ≈ 13:00).
- **Tooltip:** drop focus before the capture, or the "Main menu" balloon shows up.
- **Window size:** do not resize the user's window. Once, the page area ended up at 607×383 and
  they had to fix it. Ask them to close DevTools and maximize, and wait for the "ready".
- **When you finish, put everything back as it was:** zoom, side menu, today's date, receiver tab
  closed and server stopped.

**What does not work (tested):** the Google Calendar web app is **not responsive** at phone width.
- **Narrow iframe:** in a 393 px iframe (same origin, injected into `calendar.google.com/robots.txt`),
  the desktop header overflows the width.
- **"Mobile" URL:** `/calendar/u/0/m` redirects to `/gp`, the old mobile version, with a 2010 look
  and the e-mail exposed.
- **Conclusion:** for the calendar on a phone, use the app screenshot (section 1).

## 3. Faithful app kit in Figma (WhatsApp, Instagram...)

Figma Community files have to be **duplicated** into the user's account ("Open in Figma") before the
Figma MCP can read or edit them. Kits that worked: "WhatsApp Screens 2025 with Meta AI – UI for iOS"
and "Instagram – UI Kit 4.0". We found no faithful kit of the Google Calendar app: only redesigns,
and a "Google Calendar" file with a misleading thumbnail (the comments warn about it).

Flow that worked through the Figma MCP:
- Load the Figma skill (`get_figma_skill figma-use`) before `use_figma`.
- **Clone ready-made screens from the kit and swap only the text.** Do not assemble a new screen from
  loose components.
- **Fonts:** the kit's font ("SF Pro Text") may fail to load. Remap it to "SF Pro" with
  `setRangeFontName` before editing.
- **A failing script undoes everything** (it is atomic). "node does not exist" after a detach or a
  visibility change: detach first and fetch the nodes again.
- **Conversation in auto-layout (VERTICAL, bottom-aligned):** `y` is ignored. Put the item in the flow
  (`layoutPositioning AUTO`) in the right order.
- **List previews with leftovers** (italic, icon, indent): `resetOverrides`, `paragraphIndent = 0` and
  turn off "Disappearing".
- **Exporting:**
  - `download_assets` with `defaultScale: 4` (1572×3408 for 393×852). `get_screenshot` does not go past 1x.
  - The export comes out opaque (gray background). For loose pieces (bubbles, keyboard), export over
    black and over white and recover the transparency with
    `node "$SKILL/kit/motion.mjs" alpha assets/ui/export-preto.png assets/ui/export-branco.png assets/ui/export.png`.
  - To get a simple node on image upload, do `detachInstance` and use `upload_assets`
    (multipart POST).
- **Figma asset links are short-lived secrets:** do not paste them into a file or a message.

- **Emoji vanish in the export.** Figma's export does not draw color emoji (neither Apple Color Emoji
  nor Noto): a hole is left in the text. Replace each emoji with "■■" filled magenta (#FF00FF),
  export, find the magenta pixels in each bubble, paint them with the bubble color and paste the
  Apple emoji PNG
  (`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/<code>.png`,
  e.g. `2728` ✨, `1f970` 🥰) at ~76 px, centered. Keep the order of the swapped emoji.

**Animating the conversation without redrawing it:**
- Export the screen's "chrome" (header, background, typing bar) and each bubble as a transparent PNG,
  in their final positions.
- Animate the stack: the new bubble enters from below and the stack rises by its offset.
- Ready-made generator: `kit/templates/chat-scene.mjs` (JSON config with bubbles, arrival times and
  cameras; computes the stack's rise and writes the scene). See the file header.

**A conversation that convinces a business owner (the "wow"):** the AI never dumps the price in one
block. It introduces itself by name, asks the person's name, explains how it works before the price,
checks the calendar and books, in short consecutive messages, with an occasional emoji. Show the
contrast first: the front desk that answers the next day with "Bom dia. R$ 1.200,00" and the "type 1"
menu.
- "Typing": cover the text with rectangles in the field's color and reveal them with `scaleX` in `steps()`.
- A list that "flips" (e.g. everyone confirmed at 18:00): reveal strips from a second export with
  `clip-path: inset()`, row by row.

## Device frame

The `cena-celular.html` template draws an iPhone in CSS, sharp at any zoom and with no external file.
For a PNG frame, use an official bezel (Apple Design Resources → Product Bezels) or a frame from a
Figma kit. The PNG should be 473×932 pt with the screen cut out at (40,40), 393×852. It goes in with
`mix-blend-mode: multiply`, through the rig's `data-moldura` attribute. Record screens at 3x or 4x:
the camera reaches 4.2x on the ✓✓ close-up.
