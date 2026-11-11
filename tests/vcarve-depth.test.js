// V-carve geometry checks
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));  // tests: show every tab at once
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  const strip = '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="10mm" viewBox="0 0 100 10"><rect x="0" y="0" width="100" height="10"/></svg>';
  const check = async (bit, depth) => p.evaluate(async ([strip, bit, depth]) => {
    EasyCarve.items().splice(0);
    const d = EasyCarve.loadSvgText(strip); EasyCarve.setDesign(d, 'strip');
    document.querySelector('label:has(input[value=vcarve])').click();
    const bs = document.getElementById('bit'); bs.value = bit; bs.dispatchEvent(new Event('change'));
    const dp = document.getElementById('depth'); dp.value = depth; dp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 300));
    const it = EasyCarve.items()[0];
    const J = EasyCarve.buildJob(), t = J.ops[0].text;
    const zs = [...t.matchAll(/G1 Z(-?[\d.]+)/g)].map(m => +m[1]);
    // the deepest cut must sit on the strip's centre line, and every ring's depth must match its distance from the edge
    let worst = 0;
    for (const ln of t.split('\n')) { }
    return { mode: it.opts.mode, bit: it.opts.bit, deepest: Math.min(...zs), rings: J.preview.length, min: Math.round(J.minutes) };
  }, [strip, bit, depth]);
  console.log('90° V-bit, limit 10 mm (expect deepest -5):', JSON.stringify(await check('vbit90', 10)));
  console.log('60° V-bit, limit 3 mm (expect deepest -3, flat bottom):', JSON.stringify(await check('vbit', 3)));
  console.log('60° V-bit, limit 10 mm (expect deepest -8.66):', JSON.stringify(await check('vbit', 10)));
  // ring depth vs distance check on the 90° case: a ring at height y inside the strip must be at depth = distance to nearest edge
  const ok = await p.evaluate(async ([strip]) => {
    EasyCarve.items().splice(0);
    EasyCarve.setDesign(EasyCarve.loadSvgText(strip), 'strip');
    document.querySelector('label:has(input[value=vcarve])').click();
    const bs = document.getElementById('bit'); bs.value = 'vbit90'; bs.dispatchEvent(new Event('change'));
    const dp = document.getElementById('depth'); dp.value = 10; dp.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 300));
    const it = EasyCarve.items()[0], tp = EasyCarve.buildJob().preview;
    let worst = 0;
    for (const ring of tp) {
      for (const [x, y] of ring.pts) {
        if (x < it.x + 6 || x > it.x + 94) continue;            // ignore the rounded ends
        const dEdge = Math.min(y - it.y, it.y + 10 - y);
        worst = Math.max(worst, Math.abs(dEdge - ring.z));
      }
    }
    return worst;
  }, [strip]);
  console.log('largest depth error along the strip (mm):', ok.toFixed(3));
  // real lettering
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.click('#tabText'); await p.fill('#textIn', 'Croeso'); await p.click('#useTextBtn'); await p.waitForTimeout(1500);
  console.log('text piece:', await p.evaluate(() => { const i = EasyCarve.items()[0]; return i.opts.mode + ' / ' + i.opts.bit; }), '|', await p.textContent('#estimate'));
  await p.selectOption('#material', 'slate'); await p.waitForTimeout(600);
  console.log('slate warning:', (await p.textContent('#boundsWarn')).slice(0, 90));
  await p.check('#zoom'); await p.waitForTimeout(400);
  await p.locator('.view').screenshot({ path: '/tmp/vcarve-text.png' });
  console.log('errors', errs); await b.close();
})();
