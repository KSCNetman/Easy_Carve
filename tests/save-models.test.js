const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { addVecItem({ type: 'rect', w: 120, h: 80, r: 10 }, 'Frame line', 20, 20); });
  await p.click('#mouldBtn'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(800);
  await p.setInputFiles('#stlIn', __dirname + '/pyramid.stl'); await p.waitForTimeout(300); await p.click('#wizBtns >> text=Import'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const it = EasyCarve.items().at(-1); it.x = 60; it.y = 40; });
  console.log(await p.evaluate(() => {
    const t = J => J.ops.map(o => o.text).join('');
    const before = t(EasyCarve.buildJob()), file = JSON.stringify(EasyCarve.serializeJob());
    EasyCarve.items().splice(0); EasyCarve.loadJob(JSON.parse(file));
    const after = t(EasyCarve.buildJob());
    const fr = EasyCarve.items().find(i => /Frame/.test(i.name));
    return JSON.stringify({ identical: before === after, kb: Math.round(file.length / 1024), frameEditable: !!(fr.vec && fr.vec.type), modelHeights: !!EasyCarve.items().at(-1).design.hmap });
  }));
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
