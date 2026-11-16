// Job setup: where X0 Y0 and Z0 are
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { addVecItem({ type: 'rect', w: 60, h: 40, r: 0 }, 'Box', 120, 80); const it = EasyCarve.items()[0]; Object.assign(it.opts, { mode: 'engrave', bit: 'vbit', depth: 1 }); presetFor(it.opts); });
  await p.click('#boardBox summary'); await p.check('#boardOn'); await p.fill('#boardW', '300'); await p.fill('#boardH', '200'); await p.fill('#boardT', '18'); await p.dispatchEvent('#boardT', 'input');
  const grab = () => p.evaluate(() => { const op = EasyCarve.buildJob().ops[0]; const xs = [...op.text.replace('G0 X0 Y0', '').matchAll(/G[01] X(-?[\d.]+) Y(-?[\d.]+)/g)].map(m => [+m[1], +m[2]]); const zs = [...op.text.matchAll(/G1 Z(-?[\d.]+)/g)].map(m => +m[1]);
    return { minX: Math.min(...xs.map(q => q[0])), minY: Math.min(...xs.map(q => q[1])), deepest: Math.min(...zs), end: op.text.split('\n').filter(l => /^G0 X/.test(l)).at(-1) }; });
  const a = await grab();
  await p.selectOption('#zeroXY', 'c'); await p.selectOption('#zeroZ', 'bottom'); await p.waitForTimeout(400);
  const c = await grab();
  console.log('front-left / top :', JSON.stringify(a));
  console.log('centre / bed     :', JSON.stringify(c));
  console.log('shift X', (c.minX - a.minX).toFixed(2), 'Y', (c.minY - a.minY).toFixed(2), 'Z', (c.deepest - a.deepest).toFixed(2), '(expect -150, -100, +18)');
  console.log('machine buttons:', await p.textContent('#zeroXYBtn'), '|', await p.textContent('#zeroZBtn'));
  console.log('preview unaffected:', await p.evaluate(() => { const s = EasyCarve.simulateJob(); s.stampTo(s.moves.length); let m = 0; for (const v of s.hm) m = Math.min(m, v); return `deepest simulated ${m.toFixed(2)} mm`; }));
  await p.check('#zoom'); await p.uncheck('#zoom'); await p.waitForTimeout(300); const vb = await p.locator('#cvWrap').boundingBox(); await p.screenshot({ path: '/tmp/job-zero.png', clip: vb });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
