# Easy Carve

Simple carving software for the **Genmitsu PROVerXL 4030** (GRBL) CNC router. Runs in the browser — nothing to install.

**Open it:** https://kscnetman.github.io/Easy_Carve/ (Chrome or Edge on a computer — other browsers can't talk to the machine over USB).

## What it does
The left side is a menu: **1 Design → 2 How to cut → 3 Cut it**, plus a **Diary**.

- **Design** – SVGs, pictures/logos, photos of pencil drawings (or take one with the webcam – the page is squared off automatically), typed text, ready-made shapes and **ready-made projects** (house sign, name plaque, coaster set, chopping board, tree ornament, bookmark, keyrings). Several pieces on one job: drag to move, resize, turn, duplicate, make copies. **Jigsaw puzzle** cuts over any picture. Your piece of wood: size check and centring.
- **How to cut** (per piece) – Engrave, **V-carve** (chiselled sign-writer letters), Carve out, Cut out (exact size, thin skin), **3D raised** carving, and **inlays** (V-carved pocket + mirrored plug from a second wood). Materials include wood, slate, acrylic, Corian and aluminium. Jobs needing several bits run as steps with a bit-change prompt.
- **👀 Preview** – simulates the real G-code with the real bit shapes; watch it cut, then turn the result round in 3D.
- **Cut it** – USB control of the GRBL controller: homing, jogging, start corner, surface or **touch plate**, test run in the air, pause / stop, **carry on after a stop**, a first-time **Check my machine** wizard, plain-English error and alarm codes, **Copy report** for help, and a chime when the job finishes.
- **Diary** – every job logged with time taken and notes; *Do this again*; save / open jobs as files.

Once opened it works offline and can be installed like an app. See **[quick-guide.pdf](quick-guide.pdf)**.

## Safety
Always do a *Test run in the air* first, clamp the work, wear safety glasses and stay with the machine.

## Files
| File | What |
|---|---|
| `index.html` | The whole app (single file) |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Offline / install support |
| `quick-guide.pdf` | Printable 2-page guide |
| `drawings/` | Dad's hare and Welsh dragon drawings — one-click samples in the app |
| `tests/*.test.js` | Playwright tests: simulated GRBL controller, layout, V-carve depths, inlay fit, projects, scanner and diary, 3D preview, menu (`node tests/<name>.test.js`) |
