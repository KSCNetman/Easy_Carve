// Drawing & editing tools, driven with the mouse like a person would
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  const box = await p.locator('#cv').boundingBox();
  const at = async (x, y) => { const [sx, sy] = await p.evaluate(([x, y]) => [view.X(x), view.Y(y)], [x, y]); return [box.x + sx, box.y + sy]; };
  const drag = async (a, c) => { const A = await at(...a), C = await at(...c); await p.mouse.move(...A); await p.mouse.down(); await p.mouse.move(...C, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); };
  const click = async (x, y, n = 1) => { const A = await at(x, y); await p.mouse.click(...A, { clickCount: n }); await p.waitForTimeout(120); };
  const list = () => p.evaluate(() => EasyCarve.items().map(i => { const r = itemBox(i); return `${i.name}[${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.w.toFixed(1)}×${r.h.toFixed(1)}]`; }));

  await p.click('[data-tool=rect]'); await drag([20, 20], [120, 80]);
  await p.click('[data-tool=circle]'); await drag([120, 50], [150, 50]);
  await p.click('[data-tool=curve]'); for (const [x, y] of [[30, 150], [70, 190], [110, 150], [150, 190]]) await click(x, y); await click(190, 150, 2);
  await p.click('[data-tool=star]'); await drag([260, 60], [300, 60]);
  console.log('1. drawn:', JSON.stringify(await list()));

  // weld the rectangle and circle (click one, Shift-click the other)
  await p.click('[data-tool=select]');
  await click(40, 40); const A = await at(140, 50); await p.keyboard.down('Shift'); await p.mouse.click(...A); await p.keyboard.up('Shift'); await p.waitForTimeout(200);
  console.log('2. selected:', await p.evaluate(() => EasyCarve.selection().map(i => i.name)), '| Weld enabled:', await p.isEnabled('#tbWeld'));
  await p.click('#tbWeld'); await p.waitForTimeout(600);
  console.log('   after weld:', JSON.stringify(await list()));
  // undo and redo
  await p.click('#tbUndo'); await p.waitForTimeout(300); console.log('3. undo ->', (await list()).length, 'pieces'); await p.click('#tbRedo'); await p.waitForTimeout(300); console.log('   redo ->', (await list()).length, 'pieces');

  // subtract: a circle out of the star
  await p.click('[data-tool=circle]'); await drag([260, 60], [275, 60]);
  await p.click('[data-tool=select]'); await click(260, 95); const C = await at(268, 60); await p.keyboard.down('Shift'); await p.mouse.click(...C); await p.keyboard.up('Shift'); await p.waitForTimeout(200);
  await p.click('#tbSub'); await p.waitForTimeout(600);
  console.log('4. star minus circle:', await p.evaluate(() => { const it = EasyCarve.items().at(-1); return `${it.name}: ${it.design.paths.length} outlines (outer + hole)`; }));

  // offset the welded shape 5 mm out
  await click(40, 40); await p.click('#tbOffset'); await p.fill('#offD', '5'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(700);
  console.log('5. offset:', JSON.stringify((await list()).slice(-1)));

  // text along a new circle
  await p.click('[data-tool=circle]'); await drag([330, 200], [370, 200]);
  await p.click('#tbToc'); await p.fill('#tocText', 'EASY CARVE'); await p.fill('#tocH', '10'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2000);
  console.log('6. text on curve:', await p.evaluate(() => { const it = EasyCarve.items().at(-1); return `${it.name}, ${it.design.paths.length} outlines, mode ${it.opts.mode}`; }));

  // edit points of the curve: drag its second point 15 mm up
  await click(70, 190); const before = await p.evaluate(() => EasyCarve.items().find(i => i.name === 'Curve') && itemBox(EasyCarve.items().find(i => i.name === 'Curve')).h);
  await p.evaluate(() => EasyCarve.selectItem(EasyCarve.items().find(i => i.name === 'Curve').id));
  await p.click('[data-tool=nodes]');
  const node = await p.evaluate(() => { const it = EasyCarve.items().find(i => i.name === 'Curve'); const W = nodesWorld(it); return W[1]; });
  await drag(node, [node[0], node[1] + 15]);
  const after = await p.evaluate(() => itemBox(EasyCarve.items().find(i => i.name === 'Curve')).h);
  console.log(`7. dragged a curve point up 15 mm: height ${before.toFixed(1)} -> ${after.toFixed(1)} mm`);
  await p.click('[data-tool=select]');
  // mirror the star
  await p.evaluate(() => EasyCarve.selectItem(EasyCarve.items().find(i => /Cut-away/.test(i.name)).id)); await p.click('#tbMirror'); await p.waitForTimeout(300);
  console.log('8. mirrored:', await p.evaluate(() => EasyCarve.items().find(i => /Cut-away/.test(i.name)).mirror));
  console.log('9. G-code steps:', await p.evaluate(() => EasyCarve.buildJob().ops.map(o => `${o.bit}: ${o.items.length} pieces, ${Math.ceil(o.minutes)} min`)));
  await p.check('#zoom'); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/ws-drawn.png' });
  await p.click('[data-view="3d"]'); await p.waitForTimeout(4000); await p.screenshot({ path: '/tmp/ws-3d.png' });
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
