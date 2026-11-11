# Easy Carve

Simple carving software for the **Genmitsu PROVerXL 4030** (GRBL) CNC router. Runs in the browser — nothing to install.

**Open it:** https://kscnetman.github.io/Easy_Carve/ (Chrome or Edge on a computer — other browsers can't talk to the machine over USB).

## What it does
1. **Pick your design** – SVG files, pictures/logos, photos of pencil drawings, or typed text.
2. **How to cut it** – Engrave lines, Carve out (hollow) shapes, Cut out, or **3D raised** carving.
3. **Cut it** – connects over USB, homing, jogging, start corner / surface (or touch plate), test run in the air, pause / stop, carry on after a stop.

Also: a first-time **Check my machine** wizard, plain-English explanations of every GRBL error and alarm, a **Copy report** button for getting help, and settings that are remembered. Once opened it works offline and can be installed like an app.

See **[quick-guide.pdf](quick-guide.pdf)** for the step-by-step routine.

## Safety
Always do a *Test run in the air* first, clamp the work, wear safety glasses and stay with the machine.

## Files
| File | What |
|---|---|
| `index.html` | The whole app (single file) |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Offline / install support |
| `quick-guide.pdf` | Printable 2-page guide |
| `tests/machine-sim.test.js` | Playwright test against a simulated GRBL controller |
