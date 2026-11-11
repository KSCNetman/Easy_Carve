// Tests Easy Carve against a simulated GRBL controller (no real machine needed)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1400, height: 950 } });
  await ctx.addInitScript(() => {
    const sim = window.__sim = { rx: 0, maxRx: 0, lines: [], errAt: null, state: 'Idle', queue: [], resets: 0,
      settings: { 3: '0', 22: '1', 23: '0', 100: '800', 101: '800', 102: '800', 30: '1000', 130: '400', 131: '300', 132: '110' } };
    const RESET = String.fromCharCode(0x18);
    class Port {
      async open() {
        let ctrl; this.readable = new ReadableStream({ start(c) { ctrl = c; } });
        sim.emit = s => ctrl.enqueue(new TextEncoder().encode(s));
        let buf = '';
        this.writable = new WritableStream({ write(chunk) {
          for (const ch of new TextDecoder().decode(chunk)) {
            if (ch === '?') { sim.emit('<' + sim.state + '|MPos:-200.000,-150.000,-10.000|FS:0,0|WCO:-210.000,-160.000,-30.000>\r\n'); continue; }
            if (ch === '!') { sim.state = 'Hold'; continue; }
            if (ch === '~') { sim.state = 'Idle'; continue; }
            if (ch === RESET) { sim.rx = 0; buf = ''; sim.queue = []; sim.state = 'Idle'; sim.resets++; sim.emit("\r\nGrbl 1.1h ['$' for help]\r\n"); continue; }
            if (ch === '\r') continue;
            buf += ch; sim.rx++; sim.maxRx = Math.max(sim.maxRx, sim.rx);
            if (ch === '\n') { sim.queue.push(buf); buf = ''; }
          }
        } });
        setInterval(() => {
          for (let k = 0; k < 4 && sim.queue.length; k++) {
            if (sim.state === 'Hold') break;
            const l = sim.queue.shift(); sim.rx -= l.length; const c = l.trim(); sim.lines.push(c);
            let resp = 'ok';
            if (sim.errAt !== null && sim.lines.length === sim.errAt) { resp = 'error:22'; sim.errAt = null; }
            if (c === '$$') for (const [k2, v] of Object.entries(sim.settings)) sim.emit('$' + k2 + '=' + v + '\r\n');
            if (/^\$\d+=/.test(c)) { const [a, v] = c.slice(1).split('='); sim.settings[a] = v; }
            if (c.includes('G38.2')) sim.emit('[PRB:0.000,0.000,-5.000:1]\r\n');
            sim.emit(resp + '\r\n');
          }
        }, 2);
      }
      async close() {}
    }
    Object.defineProperty(navigator, 'serial', { value: { requestPort: async () => new Port(), addEventListener() {} } });
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/easy-carve.html');
  const sim = () => p.evaluate(() => ({ maxRx: __sim.maxRx, n: __sim.lines.length, resets: __sim.resets }));

  await p.click('#connectBtn'); await p.waitForTimeout(2500);
  console.log('1. connected; spindle field from $30 =', await p.inputValue('#spindle'), '| status:', (await p.textContent('#status')).slice(0, 40));

  // ---- full job, streamed ----
  await p.setInputFiles('#fileIn', __dirname + '/drawings/hare.jpg'); await p.waitForTimeout(2500);
  const jobLines = await p.evaluate(() => EasyCarve.jobLines(EasyCarve.makeGcode().text));
  await p.evaluate(() => { __sim.lines = []; __sim.maxRx = 0; });
  const t0 = Date.now(); await p.click('#startBtn');
  await p.waitForFunction(() => /^(Finished|Test run finished|Stopped)/.test(document.getElementById('progText').textContent), null, { timeout: 120000 });
  const got = await p.evaluate(() => __sim.lines.slice());
  const same = got.length === jobLines.length && got.every((l, i) => l === jobLines[i]);
  console.log(`2. job: ${jobLines.length} lines sent in ${((Date.now() - t0) / 1000).toFixed(1)}s, all in order: ${same}, max buffer used: ${(await sim()).maxRx}/128 | "${await p.textContent('#progText')}"`);

  // ---- error mid-job, then resume ----
  await p.evaluate(() => { __sim.lines = []; __sim.errAt = 4000; });
  await p.click('#startBtn');
  await p.waitForFunction(() => !document.getElementById('resumeBox').hidden, null, { timeout: 60000 });
  console.log('3. error mid-job:', (await p.textContent('#errBox')).slice(0, 70), '| reset sent:', (await sim()).resets >= 1);
  console.log('   resume box:', (await p.textContent('#resumeText')).slice(0, 80));
  await p.waitForTimeout(500);
  await p.evaluate(() => { __sim.lines = []; });
  await p.click('#resumeBtn');
  await p.waitForFunction(() => document.getElementById('progText').textContent.startsWith('Finished'), null, { timeout: 60000 });
  const res = await p.evaluate(() => __sim.lines.slice(0, 8));
  const total = await p.evaluate(() => __sim.lines.length);
  console.log('   resumed; first lines sent:', JSON.stringify(res), '| total', total, 'of', jobLines.length, '| finished:', await p.textContent('#progText'));

  // ---- touch plate ----
  await p.click('#probeBox summary'); await p.fill('#plateT', '19.5');
  await p.evaluate(() => { __sim.lines = []; });
  await p.click('#probeBtn'); await p.waitForTimeout(1500);
  console.log('4. touch plate commands:', JSON.stringify(await p.evaluate(() => __sim.lines)));

  // ---- machine check wizard: X reported wrong -> fix ----
  await p.click('#checkBtn'); await p.click('#wizBtns >> text=Start');
  await p.click('#wizBtns >> text=Move it'); await p.waitForTimeout(1800); await p.click('#wizBtns >> text=No, the other way');
  await p.click('#wizBtns >> text=Move it'); await p.waitForTimeout(1800); await p.click('#wizBtns >> text=Yes');
  await p.click('#wizBtns >> text=Move it'); await p.waitForTimeout(1800); await p.click('#wizBtns >> text=Yes');
  console.log('5. wizard says:', (await p.textContent('#wizBody')).replace(/\s+/g, ' ').slice(0, 70));
  await p.screenshot({ path: __dirname + '/wizard.png' });
  await p.click('#wizBtns >> text=Fix it'); await p.waitForTimeout(1500);
  console.log('   settings now $3=', await p.evaluate(() => __sim.settings[3]), '$23=', await p.evaluate(() => __sim.settings[23]), '| dialog:', await p.textContent('#wizTitle'));
  await p.click('#wizBtns >> text=Test again');
  for (let i = 0; i < 3; i++) { await p.click('#wizBtns >> text=Move it'); await p.waitForTimeout(1800); await p.click('#wizBtns >> text=Yes'); }
  await p.click('#wizBtns >> text=Bit is in place'); await p.click('#wizBtns >> text=Cut the test');
  await p.waitForSelector('#wizBtns >> text=Check', { timeout: 30000 });
  await p.fill('#mx', '49'); await p.click('#wizBtns >> text=Check'); await p.waitForTimeout(1200);
  console.log('6. measure 49mm ->', (await p.textContent('#wizBody')).replace(/\s+/g, ' ').slice(0, 150));
  await p.click('#wizBtns >> text=Fix it'); await p.waitForTimeout(1200);
  console.log('   $100 now', await p.evaluate(() => __sim.settings[100]));
  await p.click('#wizBtns >> text=Close');

  // ---- settings remembered ----
  await p.selectOption('#material', 'hard'); await p.click('label:has(input[value=relief])'); await p.fill('#rH', '6'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(800);
  console.log('7. after reload: material', await p.inputValue('#material'), '| rH', await p.inputValue('#rH'), '| plate', await p.inputValue('#plateT'),
    '| mode', await p.evaluate(() => document.querySelector('input[name=mode]:checked').value), '| relief rows shown', await p.isVisible('#rH'));
  console.log('errors', errs); await b.close();
})();
