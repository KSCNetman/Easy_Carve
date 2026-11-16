// 3D modelling: profiles, limit, tilt, fade, texture, moulding, STL import, layer visibility, sculpt tools
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);

  // a 100 x 40 rectangle as a 3D layer; read heights along its middle, left to right
  await p.evaluate(() => { addVecItem({ type: 'rect', w: 100, h: 40, r: 0 }, 'Block', 20, 20); });
  await p.click('#make3dBtn'); await p.waitForTimeout(300);
  const row = (opts) => p.evaluate(o => { const it = EasyCarve.items()[0]; Object.assign(it.opts, { rH: 6, rRound: 20, rLimit: 0, rTilt: 0, rFade: 0, rTex: '', rProfile: 'round' }, o); EasyCarve.reliefState(it).ver++;
    const out = []; for (const x of [0, 5, 10, 20, 50, 80, 90, 95, 100]) { const dist = Math.min(x, 100 - x, 20, 20); out.push(+EasyCarve.layerHeight(it, { dist, u: x, v: 20, shade: 0, groove: 0, brush: 0, label: 0 }).toFixed(2)); } return out.join(' '); }, opts);
  for (const pr of ['round', 'angle', 'cove', 'ogee', 'flat']) console.log(`profile ${pr.padEnd(5)}:`, await row({ rProfile: pr }));
  console.log('limit 3 mm   :', await row({ rLimit: 3 }));
  console.log('tilt 5° right:', await row({ rTilt: 5, rRound: 2 }));
  console.log('fade 100% →  :', await row({ rFade: 100, rRound: 2 }));
  console.log('texture rough:', await row({ rTex: 'rough', rTexAmp: 1, rTexScale: 4, rRound: 2 }));

  // moulding: a 120 x 80 frame outline swept with an ogee, 12 mm wide, 4 mm high
  await p.evaluate(() => { const it = EasyCarve.items()[0]; Object.assign(it.opts, { rTilt: 0, rFade: 0, rTex: '', rLimit: 0, rProfile: 'round', rRound: 6, rH: 3, rOff: true }); });
  await p.evaluate(() => { addVecItem({ type: 'rect', w: 120, h: 80, r: 10 }, 'Frame line', 140, 20); });
  await p.click('#mouldBtn'); await p.selectOption('#mProf', 'ogee'); await p.fill('#mW', '12'); await p.fill('#mH', '4'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(1500);
  console.log('moulding:', await p.evaluate(() => { const L = EasyCarve.items().filter(i => i.opts.mode === 'relief'); const M = EasyCarve.reliefCombined(L, L[1].opts.bit, false);
    // cross-section across the frame's left side (x = 140 is the line), at y = 60
    const prof = []; for (const dx of [-6, -4, -2, 0, 2, 4, 6]) { const X = 140 + dx, Y = 60, px = Math.round((X - M.frame.x0) * M.res - 0.5), py = Math.round((M.frame.y1 - Y) * M.res - 0.5); prof.push((M.surf[py * M.W + px] + M.D).toFixed(2)); }
    return `D ${M.D.toFixed(2)} mm; across the band (−6…+6 mm): ${prof.join(' ')}`; }));

  // STL import: the pyramid, 10 mm tall
  await p.setInputFiles('#stlIn', __dirname + '/pyramid.stl'); await p.waitForTimeout(400);
  await p.click('#wizBtns >> text=Import'); await p.waitForTimeout(2500);
  console.log('STL:', await p.evaluate(() => { const it = EasyCarve.items().at(-1); const b = itemBox(it);
    const mid = EasyCarve.layerHeight(it, { dist: 99, u: it.design.w / 2, v: it.design.h / 2, shade: 0, groove: 0, brush: 0, label: 0 });
    const q = EasyCarve.layerHeight(it, { dist: 99, u: it.design.w * 0.75, v: it.design.h / 2, shade: 0, groove: 0, brush: 0, label: 0 });
    return `${it.name}: ${b.w.toFixed(1)} × ${b.h.toFixed(1)} mm, height ${it.opts.rH} mm, kind ${it.opts.rKind}; centre ${mid.toFixed(2)} mm, halfway out ${q.toFixed(2)} mm`; }));

  // visibility: hide the moulding -> the carving gets shallower / changes
  const D = () => p.evaluate(() => { const L = EasyCarve.items().filter(i => i.opts.mode === 'relief'); return EasyCarve.reliefCombined(L, 'ball3', false).D.toFixed(2); });
  const before = await D(); await p.evaluate(() => { EasyCarve.items().find(i => /moulding/.test(i.name)).opts.rOff = true; }); const after = await D();
  console.log(`hide the moulding: carving depth ${before} -> ${after} mm | layer list shows eyes:`, await p.locator('#layerList .chip').count());
  await p.evaluate(() => { EasyCarve.items().find(i => /moulding/.test(i.name)).opts.rOff = false; EasyCarve.selectItem(EasyCarve.items()[0].id); });

  // sculpt: flatten and smudge on the block
  await p.evaluate(() => { const it = EasyCarve.items()[0]; it.opts.rOff = false; EasyCarve.selectItem(it.id); });
  await p.click('#rEditBtn'); await p.waitForTimeout(600);
  const sculpt = await p.evaluate(() => { const it = EasyCarve.items()[0], E = EasyCarve.editGrid(it.design); const h0 = EasyCarve.layerHeightsDesign(it);
    rEd.tool = 'flatten'; rEd.target = 1.0; const cx = Math.round(E.W / 2), cy = Math.round(E.H / 2); for (let k = 0; k < 12; k++) rEdBrush(cx, cy);
    EasyCarve.reliefState(it).ver++; const h1 = EasyCarve.layerHeightsDesign(it); return `flatten to 1 mm: centre ${h0[cy * E.W + cx].toFixed(2)} -> ${h1[cy * E.W + cx].toFixed(2)} mm`; });
  console.log('sculpt:', sculpt); await p.click('#rEdDone');

  // the whole thing: steps, gouge check, 3D view
  await p.evaluate(() => { const it = EasyCarve.items()[0]; it.opts.rOff = true; });
  await p.evaluate(() => { const it = EasyCarve.items().at(-1); it.x = 180; it.y = 40; EasyCarve.selectItem(it.id); }); await p.waitForTimeout(1500);
  console.log('job:', await p.evaluate(() => EasyCarve.buildJob().ops.map(o => `${o.bit} ${Math.ceil(o.minutes)} min`)));
  console.log('gouge check:', await p.evaluate(() => { const J = EasyCarve.buildJob(); const M = J.rasters[0].M; const sim = EasyCarve.simulateJob(); sim.stampTo(sim.moves.length);
    let worst = 0, n = 0; for (let py = 0; py < sim.H; py++) for (let px = 0; px < sim.W; px++) { const X = sim.x0 + (px + 0.5) / sim.res, Y = sim.y1 - (py + 0.5) / sim.res;
      const mx = Math.round((X - M.frame.x0) * M.res - 0.5), my = Math.round((M.frame.y1 - Y) * M.res - 0.5); if (mx < 2 || my < 2 || mx >= M.W - 2 || my >= M.H - 2) continue;
      const want = M.surf[my * M.W + mx]; let flat = true; for (const o of [-2, 2, -2 * M.W, 2 * M.W]) if (Math.abs(M.surf[my * M.W + mx + o] - want) > 0.25) flat = false;
      const got = sim.hm[py * sim.W + px]; if (flat && got < want - 0.25) { n++; worst = Math.max(worst, want - got); } }
    return `deepest cut below the design ${worst.toFixed(2)} mm at ${n} spots`; }));
  await p.check('#zoom'); await p.click('[data-view="3d"]'); await p.waitForTimeout(4500);
  const vb = await p.locator('.view').boundingBox(); await p.screenshot({ path: '/tmp/model-3d.png', clip: vb });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
