const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  for (const [side, word] of [['left', 'HARES RUN WILD'], ['right', 'EST 2023']]) {
    await p.evaluate(() => { const c = EasyCarve.items().find(i => i.name === 'Circle'); if (c) EasyCarve.selectItem(c.id); });
    if (side === 'left') await p.evaluate(() => { EasyCarve.setTool('select'); const v = { type: 'ellipse', rx: 60, ry: 60 }; addVecItem(v, 'Circle', 40, 40); });
    await p.click('#tbToc'); await p.fill('#tocText', word); await p.fill('#tocH', '11'); await p.selectOption('#tocSide', side); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(1800);
  }
  // the hare in the middle
  await p.evaluate(() => { const c = EasyCarve.items()[0]; EasyCarve.selectItem(c.id); });
  await p.check('#zoom'); await p.waitForTimeout(400);
  const cv = await p.locator('#cv').boundingBox(); await p.screenshot({ path: '/tmp/toc-fixed.png', clip: cv });
  console.log('errors', errs); await b.close();
})();
