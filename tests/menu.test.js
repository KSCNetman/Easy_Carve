// Menu tabs: one section at a time, Next buttons, errors jump to "Cut it", last tab remembered
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html'); await p.evaluate(() => localStorage.clear()); await p.reload();
  const visible = () => p.evaluate(() => [...document.querySelectorAll('.panel > .step')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.id));
  const pageScroll = () => p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  console.log('start: showing', await visible(), '| page scrolls by', await pageScroll(), 'px');
  await p.screenshot({ path: '/tmp/menu-1-design.png' });
  // make a sign using only what's on screen
  await p.selectOption('#projectSel', 'houseSign'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
  await p.click('.nextBtn[data-next=cut]'); console.log('after Next:', await visible());
  await p.screenshot({ path: '/tmp/menu-2-cut.png' });
  await p.click('.nextBtn[data-next=machine]'); console.log('after Next:', await visible());
  await p.screenshot({ path: '/tmp/menu-3-machine.png' });
  await p.click('#menu button[data-tab=diary]'); console.log('menu Diary:', await visible());
  await p.click('#menu button[data-tab=design]');
  await p.evaluate(() => EasyCarve.onLine('ALARM:9')); console.log('alarm while on Design ->', await visible(), '| error shown:', await p.isVisible('#errBox'));
  await p.click('#menu button[data-tab=cut]'); await p.reload(); await p.waitForTimeout(500);
  console.log('after reload remembers:', await visible());
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
