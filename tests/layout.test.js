// Layout board: several pieces, per-piece modes, multi-bit steps, drag/resize/turn, copies
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));  // tests: show every tab at once
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  const job = () => p.evaluate(() => { const J = EasyCarve.buildJob(); return { ops: J.ops.map(o => ({ bit: o.bit, items: o.items.map(i => i.name + ':' + i.opts.mode), min: Math.ceil(o.minutes), lines: o.text.split('\n').length })), notes: J.notes }; });

  // 1. arched sign, cut out
  await p.selectOption('#addShapeSel', 'arch').catch(() => {});        // hidden until first piece: use the API for the first one
  await p.evaluate(() => { const d = EasyCarve.shapeDesign('arch'); EasyCarve.setDesign(d, d.name); });
  await p.fill('#width', '220'); await p.dispatchEvent('#width', 'input');
  await p.click('label:has(input[value=cut])'); await p.waitForTimeout(300);
  // 2. hare picture on it, engraved with the V-bit
  await p.click('#addDesignBtn').catch(() => {});
  await p.evaluate(() => { document.getElementById('fileIn').click = () => {}; });
  await p.setInputFiles('#fileIn', __dirname + '/../drawings/hare.jpg'); await p.waitForTimeout(2500);
  await p.fill('#width', '150'); await p.dispatchEvent('#width', 'input');
  await p.fill('#offX', '45'); await p.dispatchEvent('#offX', 'input');
  await p.fill('#offY', '40'); await p.dispatchEvent('#offY', 'input');
  // 3. text, carved out with the flat bit
  await p.click('#addTextBtn'); await p.fill('#textIn', 'Croeso'); await p.click('#useTextBtn'); await p.waitForTimeout(800);
  await p.fill('#width', '90'); await p.dispatchEvent('#width', 'input');
  await p.fill('#offX', '75'); await p.dispatchEvent('#offX', 'input');
  await p.fill('#offY', '18'); await p.dispatchEvent('#offY', 'input');
  await p.waitForTimeout(1500);
  console.log('pieces:', await p.evaluate(() => EasyCarve.items().map(i => `${i.name} (${i.opts.mode}, ${i.opts.bit})`)));
  console.log('job:', JSON.stringify(await job()));
  console.log('ops box shown:', await p.isVisible('#opsBox'), '| estimate:', await p.textContent('#estimate'));
  await p.check('#zoom'); await p.waitForTimeout(400);
  await p.locator('.view').screenshot({ path: '/tmp/layout-sign.png' });

  // 4. drag the text piece 20 mm to the right with the mouse, then turn it
  const before = await p.evaluate(() => { const t = EasyCarve.items()[2]; return [t.x, t.y]; });
  const box = await p.locator('#cv').boundingBox();
  const pt = await p.evaluate(() => { const t = EasyCarve.items()[2]; return null; });
  const scr = await p.evaluate(() => { const it = EasyCarve.items()[2]; return [it.x + 10, it.y + 5]; });
  // convert mm -> screen using the view the app keeps
  const px = await p.evaluate(([x, y]) => [view.X(x), view.Y(y)], scr);
  await p.mouse.move(box.x + px[0], box.y + px[1]); await p.mouse.down();
  const px2 = await p.evaluate(([x, y]) => [view.X(x + 20), view.Y(y)], scr);
  await p.mouse.move(box.x + px2[0], box.y + px2[1], { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(600);
  const after = await p.evaluate(() => { const t = EasyCarve.items()[2]; return [t.x, t.y]; });
  console.log('drag text: before', before, 'after', after, '| fields show', await p.inputValue('#offX'));
  await p.fill('#rot', '90'); await p.dispatchEvent('#rot', 'input'); await p.waitForTimeout(400);
  console.log('turned 90°: height now', await p.textContent('#heightOut'), 'mm');
  await p.fill('#rot', '0'); await p.dispatchEvent('#rot', 'input');

  // 5. copies: a coaster set
  await p.evaluate(() => { const d = EasyCarve.shapeDesign('circle'); EasyCarve.setDesign(d, 'Coaster'); });
  await p.click('#copiesBtn'); await p.fill('#cpX', '3'); await p.fill('#cpY', '2'); await p.click('#wizBtns >> text=Make copies'); await p.waitForTimeout(800);
  console.log('after copies, pieces:', await p.evaluate(() => EasyCarve.items().length), '| chips:', await p.locator('.chip').count());
  console.log('save files:', await p.evaluate(() => EasyCarve.buildJob().ops.length), '| G-code first lines:', JSON.stringify(await p.evaluate(() => EasyCarve.buildJob().ops[0].text.split('\n').slice(0, 5))));
  await p.locator('.step').nth(0).screenshot({ path: '/tmp/layout-panel.png' });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
