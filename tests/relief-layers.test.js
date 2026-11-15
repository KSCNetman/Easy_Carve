// 3D: shading, heights by area, layers, fitting the wood
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();

  // 1. the hare as a 3D layer, with and without pencil shading
  await p.setInputFiles('#fileIn', __dirname + '/../drawings/hare.jpg'); await p.waitForTimeout(2500);
  await p.selectOption('#imgKind', 'relief'); await p.waitForTimeout(4000);
  const surf = () => p.evaluate(() => { const its = EasyCarve.items().filter(i => i.opts.mode === 'relief');
    const M = EasyCarve.reliefCombined(its, its[0].opts.bit); let n = 0, sum = 0, sum2 = 0;
    // how varied is the top of the hare? (standard deviation of height on the hare)
    for (let i = 0; i < M.surf.length; i++) { const h = M.surf[i] + M.D; if (h > 0.5) { n++; sum += h; sum2 += h * h; } }
    const mean = sum / n; return { D: +M.D.toFixed(2), spread: +Math.sqrt(sum2 / n - mean * mean).toFixed(3), shade: EasyCarve.items()[0].opts.rShade, shown: !document.getElementById('rShadeRow').hidden }; });
  console.log('1. hare, shading 40% (set automatically):', JSON.stringify(await surf()));
  await p.fill('#rShade', '0'); await p.dispatchEvent('#rShade', 'input'); await p.waitForTimeout(300);
  console.log('   shading off:', JSON.stringify(await surf()));
  await p.fill('#rShade', '70'); await p.dispatchEvent('#rShade', 'input'); await p.waitForTimeout(300);
  console.log('   shading 70%:', JSON.stringify(await surf()));

  // 2. heights by area: pick the biggest area (the body) and make it 160% and +1.5 mm
  await p.click('#rEditBtn'); await p.waitForTimeout(800);
  const pick = await p.evaluate(() => { const it = EasyCarve.items()[0], E = EasyCarve.editGrid(it.design); const cnt = {};
    for (let i = 0; i < E.label.length; i++) if (E.label[i]) cnt[E.label[i]] = (cnt[E.label[i]] || 0) + 1;
    const big = +Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; let at = 0; for (let i = 0; i < E.label.length; i++) if (E.label[i] === big) { at = i; break; }
    return { big, n: E.n, areas: Object.keys(cnt).length, x: at % E.W + 3, y: Math.floor(at / E.W) + 3, W: E.W, H: E.H }; });
  const cb = await p.locator('#rEdCanvas').boundingBox();
  // click inside the body area (find a pixel well inside it)
  const inner = await p.evaluate(big => { const it = EasyCarve.items()[0], E = EasyCarve.editGrid(it.design); let best = null, bd = -1;
    for (let y = 5; y < E.H - 5; y += 3) for (let x = 5; x < E.W - 5; x += 3) { const i = y * E.W + x; if (E.label[i] !== big) continue;
      let d = 0; while (d < 40 && E.label[i + d] === big && E.label[i - d] === big && E.label[i + d * E.W] === big && E.label[i - d * E.W] === big) d++;
      if (d > bd) { bd = d; best = [x, y]; } } return best; }, pick.big);
  await p.mouse.click(cb.x + (inner[0] + 0.5) / pick.W * cb.width, cb.y + (inner[1] + 0.5) / pick.H * cb.height); await p.waitForTimeout(500);
  const before = await p.evaluate(() => { const it = EasyCarve.items()[0]; const h = EasyCarve.layerHeightsDesign(it); let m = 0; for (const v of h) m = Math.max(m, v); return m; });
  await p.fill('#rEdScale', '160'); await p.dispatchEvent('#rEdScale', 'input'); await p.fill('#rEdAdd', '1.5'); await p.dispatchEvent('#rEdAdd', 'input'); await p.waitForTimeout(500);
  const after = await p.evaluate(() => { const it = EasyCarve.items()[0]; const h = EasyCarve.layerHeightsDesign(it); let m = 0; for (const v of h) m = Math.max(m, v); return { m, regions: JSON.stringify(EasyCarve.reliefState(it).regions) }; });
  console.log(`2. ${pick.areas} areas found; picked area ${pick.big}; tallest point ${before.toFixed(2)} -> ${after.m.toFixed(2)} mm | edits ${after.regions}`);
  // brush: raise the head a little
  await p.click('[data-rtool=raise]');
  await p.mouse.move(cb.x + cb.width * 0.82, cb.y + cb.height * 0.35); await p.mouse.down();
  await p.mouse.move(cb.x + cb.width * 0.86, cb.y + cb.height * 0.38, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  console.log('   brushed:', await p.evaluate(() => { const rs = EasyCarve.reliefState(EasyCarve.items()[0]); let n = 0, m = 0; if (rs.brush) for (const v of rs.brush) if (v) { n++; m = Math.max(m, v); } return `${n} spots raised, up to ${m.toFixed(2)} mm`; }));
  await p.click('[data-rtool=lasso]');
  const loop = [[0.30,0.62],[0.36,0.70],[0.30,0.80],[0.18,0.86],[0.12,0.80],[0.20,0.70],[0.30,0.62]];
  await p.mouse.move(cb.x + cb.width * loop[0][0], cb.y + cb.height * loop[0][1]); await p.mouse.down();
  for (const [u, v] of loop.slice(1)) await p.mouse.move(cb.x + cb.width * u, cb.y + cb.height * v, { steps: 6 });
  await p.mouse.up(); await p.waitForTimeout(400);
  await p.fill('#rEdScale', '50'); await p.dispatchEvent('#rEdScale', 'input'); await p.waitForTimeout(400);
  console.log('   circled an area:', await p.evaluate(() => { const it = EasyCarve.items()[0], rs = EasyCarve.reliefState(it); return JSON.stringify({ lassos: (rs.lassos || []).length, settings: rs.regions }); }));
  await p.locator('#reliefDlg').screenshot({ path: '/tmp/relief-editor.png' });
  await p.click('#rEdDone'); await p.waitForTimeout(800);

  // 3. layers: a plaque underneath, the hare on top, raised letters on top
  await p.selectOption('#addShapeSel', 'round');
  await p.waitForTimeout(300); await p.click('label:has(input[value=relief])'); await p.waitForTimeout(300);
  await p.fill('#width', '230'); await p.dispatchEvent('#width', 'input');
  await p.fill('#rH', '2'); await p.dispatchEvent('#rH', 'input'); await p.fill('#rRound', '3'); await p.dispatchEvent('#rRound', 'input');
  await p.fill('#offX', '10'); await p.dispatchEvent('#offX', 'input'); await p.fill('#offY', '10'); await p.dispatchEvent('#offY', 'input');
  await p.click('#upBtn'); await p.waitForTimeout(200);                                    // plaque becomes the bottom layer
  await p.click('#addTextBtn'); await p.fill('#textIn', 'Hares Run'); await p.click('#useTextBtn'); await p.waitForTimeout(1200);
  await p.click('label:has(input[value=relief])'); await p.waitForTimeout(300);
  await p.fill('#width', '110'); await p.dispatchEvent('#width', 'input'); await p.fill('#rH', '1.5'); await p.dispatchEvent('#rH', 'input'); await p.fill('#rRound', '0.6'); await p.dispatchEvent('#rRound', 'input');
  // hare: shrink and place on the plaque, text below it, all centred
  await p.evaluate(() => { const [pl, hare, txt] = EasyCarve.items(); hare.w = 150; EasyCarve.selectItem(hare.id); EasyCarve.alignPiece('xy'); hare.y += 12; EasyCarve.selectItem(txt.id); EasyCarve.alignPiece('x'); txt.y = pl.y + 8; EasyCarve.selectItem(txt.id); });
  await p.waitForTimeout(1500);
  console.log('3. layers:', JSON.stringify(await p.evaluate(() => { const its = EasyCarve.items(); const J = EasyCarve.buildJob();
    return { order: its.map(i => `${i.name.slice(0, 14)}:${i.opts.mode}/${i.opts.rCombine || 'top'}`), steps: J.ops.map(o => `${o.bit} ${Math.ceil(o.minutes)}min`), depth: +J.reliefD.toFixed(2) }; })));
  // 4. my wood: 12 mm thick -> too deep -> fit
  await p.click('#boardBox summary'); await p.check('#boardOn'); await p.fill('#boardW', '250'); await p.fill('#boardH', '170'); await p.fill('#boardT', '9');
  await p.dispatchEvent('#boardT', 'input'); await p.check('#boardFull'); await p.dispatchEvent('#boardFull', 'change'); await p.waitForTimeout(1500);
  console.log('4. wood 9 mm:', (await p.textContent('#boundsWarn')).match(/The 3D carving[^.]*\.[^–]*/)?.[0] || '(no depth warning)');
  await p.click('#rFitBtn'); await p.waitForTimeout(1500);
  console.log('   after Fit:', JSON.stringify(await p.evaluate(() => { const J = EasyCarve.buildJob(); const R = J.rasters[0].M;
    return { depth: +J.reliefD.toFixed(2), area: R.rect[0].map(v => +v.toFixed(1)).concat(R.rect[2].map(v => +v.toFixed(1))), heights: EasyCarve.items().map(i => i.opts.rH) }; })));
  // gouge check: simulate the real G-code and compare with the intended surface
  console.log('   gouge check:', await p.evaluate(() => {
    const air = document.getElementById('airRun').checked; const J = EasyCarve.buildJob(); const M = J.rasters[0].M;
    const sim = EasyCarve.simulateJob(); sim.stampTo(sim.moves.length);
    let worst = 0, n = 0, left = 0, cnt = 0;
    for (let py = 0; py < sim.H; py++) for (let px = 0; px < sim.W; px++) {
      const X = sim.x0 + (px + 0.5) / sim.res, Y = sim.y1 - (py + 0.5) / sim.res;
      const mx = Math.round((X - M.frame.x0) * M.res - 0.5), my = Math.round((M.frame.y1 - Y) * M.res - 0.5);
      if (mx < 2 || my < 2 || mx >= M.W - 2 || my >= M.H - 2) continue;
      const want = M.surf[my * M.W + mx], got = sim.hm[py * sim.W + px];
      if (want <= -M.D + 0.01 && X > M.rect[0][0] + 3 && X < M.rect[2][0] - 3 && Y > M.rect[0][1] + 3 && Y < M.rect[2][1] - 3) { cnt++; if (got - want > 0.3) left++; }
      let flat = true; for (const o of [-2, 2, -2 * M.W, 2 * M.W]) if (Math.abs(M.surf[my * M.W + mx + o] - want) > 0.25) flat = false;
      if (flat && got < want - 0.25) { n++; if (want - got > worst) { worst = want - got; window.__worstAt = [X.toFixed(1), Y.toFixed(1), want.toFixed(2), got.toFixed(2)]; } }
    }
    window.__spots = window.__spots || []; return `worst at X,Y,want,got=${window.__worstAt} | on gently sloping surface: deepest cut below the design ${worst.toFixed(2)} mm at ${n} spots; background left uncut ${(left / Math.max(1, cnt) * 100).toFixed(1)}%; total time ${Math.round(J.minutes)} min`;
  }));
  // 5. preview
  await p.check('#zoom'); await p.waitForTimeout(500); await p.locator('.view').screenshot({ path: '/tmp/relief-layers-view.png' });
  await p.click('#previewBtn'); await p.waitForTimeout(800); await p.click('#simEnd'); await p.waitForTimeout(800);
  await p.locator('#simDlg').screenshot({ path: '/tmp/relief-layers-flat.png' });
  await p.click('#simView'); await p.waitForTimeout(2000); await p.locator('#simDlg').screenshot({ path: '/tmp/relief-layers-3d.png' });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
