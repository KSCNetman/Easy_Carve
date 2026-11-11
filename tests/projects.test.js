// Ready-made projects and jigsaw
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));  // tests: show every tab at once
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  for (const k of ['houseSign', 'plaque', 'coasters', 'board', 'ornament', 'bookmark', 'keyrings']) {
    await p.selectOption('#projectSel', k);
    await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const J = EasyCarve.buildJob(); return {
      pieces: EasyCarve.items().length, steps: J.ops.map(o => o.bit + ':' + Math.ceil(o.minutes) + 'min'),
      warn: document.getElementById('boundsWarn').hidden ? '' : document.getElementById('boundsWarn').textContent.slice(0, 120) }; });
    console.log(k.padEnd(10), JSON.stringify(r));
    if (['houseSign', 'coasters', 'board', 'bookmark'].includes(k)) await p.locator('.view').screenshot({ path: `/tmp/proj-${k}.png` });
  }
  // jigsaw over Dad's dragon
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.setInputFiles('#fileIn', __dirname + '/../drawings/dragon.jpg'); await p.waitForTimeout(3000);
  await p.fill('#width', '240'); await p.dispatchEvent('#width', 'input'); await p.waitForTimeout(300);
  await p.selectOption('#addShapeSel', 'jigsaw'); await p.click('#wizBtns >> text=Make the puzzle'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const J = EasyCarve.buildJob(); return { pieces: EasyCarve.items().map(i => i.name + ' ' + i.opts.mode + ' ' + i.opts.bit), steps: J.ops.map(o => o.bit + ':' + Math.ceil(o.minutes) + 'min') }; });
  console.log('jigsaw  ', JSON.stringify(r));
  await p.locator('.view').screenshot({ path: `/tmp/proj-jigsaw.png` });
  console.log('errors', errs); await b.close();
})();
