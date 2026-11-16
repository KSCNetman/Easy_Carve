// Toolpaths & tools: cut side, tabs, ramps, drilling, two-bit clearing, tool library, toolpath list
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const set = (o) => p.evaluate(o => { const it = EasyCarve.items()[0]; Object.assign(it.opts, o); presetFor(it.opts); localCache.clear(); }, o);

  // 1. a 60 mm circle cut out with the 3.175 mm bit: outside / inside / on the line
  await p.evaluate(() => { addVecItem({ type: 'ellipse', rx: 30, ry: 30 }, 'Disc', 50, 50); });
  for (const side of ['out', 'in', 'on']) {
    await set({ mode: 'cut', bit: 'flat3', thick: 6, cutSide: side, hold: 'skin', exact: side === 'out', ramp: false });
    console.log(`1. cut ${side.padEnd(3)}: path radius`, await p.evaluate(() => { const J = EasyCarve.buildJob(), q = J.preview[0].pts; let r = 0; for (const [x, y] of q) r += Math.hypot(x - 80, y - 80); return (r / q.length).toFixed(2); }), 'mm');
  }
  // 2. tabs: 4 tabs 6 mm wide, 2 mm thick, on 6 mm wood
  await set({ cutSide: 'out', hold: 'tabs', tabN: 4, tabW: 6, tabH: 2, ramp: false });
  const tabsInfo = await p.evaluate(() => { const t = EasyCarve.buildJob().ops[0].text; const ups = (t.match(/G1 Z-4\.2\n/g) || []).length; const deep = (t.match(/G1 Z-6\.2\n/g) || []).length;
    const sim = EasyCarve.simulateJob(); sim.stampTo(sim.moves.length); let tabPx = 0, thruPx = 0;
    for (let a = 0; a < 360; a += 1) { const rad = a * Math.PI / 180, X = 80 + 31.59 * Math.cos(rad), Y = 80 + 31.59 * Math.sin(rad);
      const px = Math.round((X - sim.x0) * sim.res - 0.5), py = Math.round((sim.y1 - Y) * sim.res - 0.5), h = sim.hm[py * sim.W + px]; if (h > -4.3 && h < -4.1) tabPx++; else if (h <= -6.1) thruPx++; }
    return `climbs onto a tab ${ups}x, drops to full depth ${deep}x; around the ring: ${tabPx}° held by tabs, ${thruPx}° cut through`; });
  console.log('2. tabs:', tabsInfo);
  // 3. ramping
  await set({ hold: 'skin', ramp: true });
  console.log('3. ramp:', await p.evaluate(() => { const L = EasyCarve.buildJob().ops[0].text.split('\n'); const i = L.findIndex(l => /^G1 Z0 /.test(l) || /^G1 Z0$/.test(l) || /^G1 Z0 F/.test(l));
    const sloped = L.filter(l => /^G1 X[-\d.]+ Y[-\d.]+ Z-/.test(l)).length; return `${sloped} sloping moves (going down while moving), no straight plunges below the surface: ${!L.some((l, k) => /^G1 Z-[\d.]+ F/.test(l) && /^G0 Z0.5/.test(L[k - 1]))}`; }));
  // 4. drilling three holes
  await p.evaluate(() => { EasyCarve.items().splice(0); for (const x of [20, 40, 60]) addVecItem({ type: 'ellipse', rx: 2, ry: 2 }, 'Hole', x, 20); });
  await p.evaluate(() => { for (const it of EasyCarve.items()) { Object.assign(it.opts, { mode: 'drill', bit: 'flat3', depth: 8, peck: 3 }); presetFor(it.opts); } });
  console.log('4. drill:', await p.evaluate(() => { const t = EasyCarve.buildJob().ops[0].text; return `holes at ${[...t.matchAll(/G0 X([\d.]+) Y([\d.]+)\nG0 Z0.5\nG1 Z-3 /g)].map(m => `(${m[1]},${m[2]})`).join(' ')}; pecks to -3, -6, -8: ${/G1 Z-3 [^\n]*\nG0 Z0.5\nG0 Z-2.7\nG1 Z-6 [^\n]*\nG0 Z0.5\nG0 Z-5.7\nG1 Z-8 /.test(t)}`; }));
  // 5. carve out a 100 x 60 pocket with the 3 mm bit, clearing the middle with the 6 mm bit first
  await p.evaluate(() => { EasyCarve.items().splice(0); addVecItem({ type: 'rect', w: 100, h: 60, r: 0 }, 'Pocket', 20, 20); const it = EasyCarve.items()[0]; Object.assign(it.opts, { mode: 'pocket', bit: 'flat3', depth: 3, pClear: '', ramp: false }); presetFor(it.opts); });
  const one = await p.evaluate(() => EasyCarve.buildJob().ops.map(o => `${o.bit} ${Math.ceil(o.minutes)} min`).join(', '));
  await p.evaluate(() => { EasyCarve.items()[0].opts.pClear = 'flat6'; });
  const two = await p.evaluate(() => { const J = EasyCarve.buildJob(); const sim = EasyCarve.simulateJob(); sim.stampTo(sim.moves.length); let floor = 0, n = 0, gouge = 0;
    for (let y = 21; y < 79; y += 0.5) for (let x = 21; x < 119; x += 0.5) { const px = Math.round((x - sim.x0) * sim.res - 0.5), py = Math.round((sim.y1 - y) * sim.res - 0.5), h = sim.hm[py * sim.W + px]; n++; if (Math.abs(h + 3) < 0.05) floor++; if (h < -3.05) gouge++; }
    return `${J.ops.map(o => `${o.bit}${o.clear ? ' (clearing)' : ''} ${Math.ceil(o.minutes)} min`).join(', ')}; pocket floor cut flat: ${(floor / n * 100).toFixed(1)}%, deeper than asked: ${gouge}`; });
  console.log(`5. pocket: 3 mm bit only → ${one} | with 6 mm clearing first → ${two}`);
  // 6. tool library: change the 1/8" bit to 3.0 mm and add a 12 mm surfacing bit
  await p.evaluate(() => EasyCarve.openToolLibrary()); await p.waitForTimeout(200);
  await p.fill('#tlTable tr[data-k=flat3] .tlDia', '3'); await p.click('#tlAdd'); await p.fill('#tlTable tr[data-k^=u] .tlName', 'Surfacing bit 12 mm'); await p.fill('#tlTable tr[data-k^=u] .tlDia', '12');
  await p.click('#wizBtns >> text=Save'); await p.waitForTimeout(500);
  console.log('6. tools:', await p.evaluate(() => `flat3 now ${BITS.flat3.dia} mm; new bit in the list: ${[...document.getElementById('bit').options].some(o => /Surfacing/.test(o.text))}; offered for clearing: ${[...document.getElementById('pClear').options].some(o => /Surfacing/.test(o.text))}; saved: ${/Surfacing/.test(localStorage.getItem('easyCarve.tools'))}`));
  // 7. toolpath list: swap the order, switch one off
  await p.evaluate(() => EasyCarve.selectItem(EasyCarve.items()[0].id)); await p.waitForTimeout(800);
  const order = () => p.evaluate(() => [...document.querySelectorAll('#opsList .opRow b')].map(e => e.textContent.slice(0, 30)));
  console.log('7. list:', JSON.stringify(await order()));
  await p.click('#opsList .opRow:nth-child(2) button:nth-of-type(1)'); await p.waitForTimeout(800);
  console.log('   after ▲:', JSON.stringify(await order()), '| warning:', (await p.textContent('#boundsWarn')).includes('comes before') ? 'none needed (no cut-out)' : 'none');
  await p.uncheck('#opsList .opRow:nth-child(1) input[type=checkbox]'); await p.waitForTimeout(800);
  console.log('   switched off first:', await p.evaluate(() => { const J = EasyCarve.buildJob(); return `${J.ops.filter(o => o.skip).length} skipped, total ${Math.ceil(J.minutes)} min`; }));
  await p.locator('#tab-cut').screenshot({ path: '/tmp/tp-panel.png' });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
