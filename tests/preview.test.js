// 3D preview + board checks
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));  // tests: show every tab at once
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  const shot = async (name) => { await p.locator('#simDlg').screenshot({ path: `/tmp/sim-${name}.png` }); };
  const preview = async (name, threeD) => {
    const t0 = Date.now(); await p.click('#previewBtn'); await p.waitForTimeout(800); await p.click('#simEnd'); await p.waitForTimeout(500);
    console.log(name, 'simulated in', ((Date.now() - t0) / 1000).toFixed(1), 's;', await p.evaluate(() => { const s = EasyCarve.sim(); let min = 0; for (const v of s.hm) if (v < min) min = v; return `${s.moves.length} cutting moves, deepest ${min.toFixed(2)} mm, through at ${s.thick} mm`; }));
    await shot(name);
    if (threeD) { await p.click('#simView'); await p.waitForTimeout(1500); await shot(name + '-3d'); }
    await p.click('#simClose');
  };
  // house sign
  await p.selectOption('#projectSel', 'houseSign'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
  await preview('housesign', true);
  // board: 300 x 280 x 18, centre the job
  await p.click('#boardBox summary'); await p.fill('#boardW', '300'); await p.fill('#boardH', '280'); await p.fill('#boardT', '18');
  await p.click('#centreBtn'); await p.waitForTimeout(800);
  console.log('board centred, warnings:', JSON.stringify(await p.evaluate(() => document.getElementById('boardWarn') ? '' : document.getElementById('boardsWarn') || document.getElementById('boundsWarn').textContent)));
  await p.fill('#boardW', '200'); await p.dispatchEvent('#boardW', 'input'); await p.waitForTimeout(600);
  console.log('board too small ->', (await p.textContent('#boundsWarn')).slice(0, 110));
  await p.locator('.view').screenshot({ path: `/tmp/board-view.png` });
  await p.uncheck('#boardOn'); await p.dispatchEvent('#boardOn', 'change');
  // hare 3D relief
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.setInputFiles('#fileIn', __dirname + '/../drawings/hare.jpg'); await p.waitForTimeout(2500);
  await p.selectOption('#imgKind', 'relief'); await p.waitForTimeout(4500);
  await p.fill('#width', '120'); await p.dispatchEvent('#width', 'input'); await p.waitForTimeout(2500);
  await preview('hare-relief', true);
  // slate coaster with V-carved letter
  await p.selectOption('#projectSel', 'coasters'); await p.fill('#projText', 'D'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
  await p.selectOption('#material', 'slate'); await p.waitForTimeout(800);
  await preview('slate-coasters', false);
  console.log('errors', errs); await b.close();
})();
