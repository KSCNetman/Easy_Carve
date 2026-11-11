// Lining pieces up: buttons, snapping while dragging, tidy form column
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.selectOption('#projectSel', 'plaque'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2000);
  const centres = () => p.evaluate(() => { const [pl, , nm] = EasyCarve.items(); const c = it => { const L = it.w; return null; };
    const bx = it => { const r = itemBox(it); return [+(r.x + r.w / 2).toFixed(2), +(r.y + r.h / 2).toFixed(2)]; }; return { plaque: bx(pl), name: bx(nm) }; });
  // knock the name off-centre, then Centre
  await p.evaluate(() => { const nm = EasyCarve.items()[2]; nm.x += 23; nm.y -= 11; EasyCarve.selectItem(nm.id); });
  console.log('off centre:', JSON.stringify(await centres()));
  await p.click('[data-align=xy]'); await p.waitForTimeout(300);
  console.log('after ✛ Centre:', JSON.stringify(await centres()));
  // drag it away and back near the middle: it should snap exactly
  await p.evaluate(() => { const nm = EasyCarve.items()[2]; nm.x += 30; EasyCarve.selectItem(nm.id); }); await p.waitForTimeout(300);
  const box = await p.locator('#cv').boundingBox();
  const [sx, sy, tx, ty] = await p.evaluate(() => { const nm = EasyCarve.items()[2], r = itemBox(nm); return [view.X(r.x + r.w / 2), view.Y(r.y + r.h / 2), view.X(r.x + r.w / 2 - 28.6), view.Y(r.y + r.h / 2 + 0.7)]; });
  await p.mouse.move(box.x + sx, box.y + sy); await p.mouse.down(); await p.mouse.move(box.x + tx, box.y + ty, { steps: 6 });
  await p.screenshot({ path: '/tmp/align-snap.png', clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  await p.mouse.up(); await p.waitForTimeout(300);
  console.log('dragged near the middle (off by 1.4 mm across, 0.7 mm up) -> snapped to:', JSON.stringify(await centres()));
  // every number box starts at the same x and has the same width
  const cols = await p.evaluate(() => { const xs = new Set(), ws = new Set();
    document.querySelectorAll('#tab-design .ctl > input[type=number], #tab-cut .ctl > input[type=number]').forEach(i => { const r = i.getBoundingClientRect(); if (r.width) { xs.add(Math.round(r.left)); ws.add(Math.round(r.width)); } });
    document.querySelectorAll('#tab-cut .ctl > select').forEach(i => { const r = i.getBoundingClientRect(); if (r.width) xs.add(Math.round(r.left)); });
    return { lefts: [...xs], widths: [...ws] }; });
  console.log('number boxes and drop-downs start at x =', cols.lefts.join(', '), '| number box widths', cols.widths.join(', '));
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
