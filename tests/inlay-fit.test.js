// Inlay: pocket + plug must mate. Uses a 40 mm circle so the maths is easy to check.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.evaluate(() => { const d = EasyCarve.shapeDesign('circle'); EasyCarve.setDesign(d, 'Circle'); });
  await p.fill('#width', '40'); await p.dispatchEvent('#width', 'input'); await p.waitForTimeout(200);
  await p.click('#inlayBtn'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const [pocket, plug] = EasyCarve.items(); const itemBoxOf = it => itemBox(it);
    const J = EasyCarve.buildJob();
    // pocket: depth of each V-carve ring vs its distance from the circle edge (60° bit: depth = dist * 1.732, max 5)
    const cx = pocket.x + 20, cy = pocket.y + 20;
    let pocketErr = 0, pocketMax = 0;
    for (const ring of J.preview.filter(q => q.item === pocket.id)) for (const [x, y] of ring.pts) {
      const dEdge = 20 - Math.hypot(x - cx, y - cy);
      pocketErr = Math.max(pocketErr, Math.abs(Math.min(5, dEdge * Math.sqrt(3)) - ring.z)); pocketMax = Math.max(pocketMax, ring.z);
    }
    // plug rings: each ring's depth must equal the ideal plug wall depth at its distance from the edge
    const S = +plug.opts.inS, P = +plug.opts.inP, pcx = plug.x + (itemBoxOf(plug).w) / 2, pcy = plug.y + (itemBoxOf(plug).h) / 2;
    let plugErr = 0, n = 0, deepest = 0;
    for (const ring of J.preview.filter(q => q.item === plug.id)) for (const [x, y] of ring.pts) {
      const sd = Math.hypot(x - pcx, y - pcy) - 20, ideal = Math.min(P, Math.max(0.05, S + sd * Math.sqrt(3)));
      plugErr = Math.max(plugErr, Math.abs(ideal - ring.z)); n++; deepest = Math.max(deepest, ring.z);
    }
    // fit: plug pushed in until its sides touch -> how far it goes in at each distance, vs the pocket depth there
    const gap = P - S; let fitErr = 0;
    for (let d = 0.2; d < 2.8; d += 0.2) { const zPlug = Math.max(-P, Math.min(0, -S + d * Math.sqrt(3))); const goesIn = S + zPlug; fitErr = Math.max(fitErr, Math.abs(goesIn - Math.min(5, d * Math.sqrt(3)))); }
    return { pieces: EasyCarve.items().map(i => `${i.name} [${i.opts.mode}${i.mirror ? ', mirrored' : ''}]`), S, P,
      steps: J.ops.map(o => `${o.bit}${o.plug ? ' (plug wood)' : ''}: ${Math.ceil(o.minutes)} min`),
      pocketDepthErr: +pocketErr.toFixed(3), pocketDeepest: pocketMax, plugRingErr: +plugErr.toFixed(3), plugDeepest: deepest, samples: n, fitErr: +fitErr.toFixed(3) };
  });
  console.log(JSON.stringify(r, null, 1));
  // the dragon as an inlay
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.selectOption('#imgKind', 'shape').catch(() => {});
  await p.setInputFiles('#fileIn', __dirname + '/../drawings/hare.jpg'); await p.waitForTimeout(2500);
  await p.selectOption('#imgKind', 'shape'); await p.waitForTimeout(2500);
  await p.fill('#width', '140'); await p.dispatchEvent('#width', 'input'); await p.waitForTimeout(300);
  await p.click('#inlayBtn'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(4000);
  console.log('hare inlay steps:', await p.evaluate(() => EasyCarve.buildJob().ops.map(o => `${o.bit}${o.plug ? ' (plug wood)' : ''}: ${Math.ceil(o.minutes)} min`)));
  await p.check('#zoom'); await p.waitForTimeout(500);
  await p.locator('.view').screenshot({ path: __dirname + '/inlay-hare.png' });
  console.log('warning:', (await p.textContent('#boundsWarn')).slice(0, 120));
  console.log('errors', errs); await b.close();
})();
