// Scanner straightening, job file round trip, diary, finished alert
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.panel > .step { display: block !important; }'; document.head.append(st); }));  // tests: show every tab at once
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + __dirname + '/../index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();

  // 1. a skewed "phone photo" of the page on a dark table
  const page = fs.readFileSync(__dirname + '/../drawings/hare-thumb.jpg').toString('base64');
  const r = await p.evaluate(async (page) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + page; await img.decode();
    const PW = img.naturalWidth, PH = img.naturalHeight, pc = document.createElement('canvas'); pc.width = PW; pc.height = PH;
    pc.getContext('2d').drawImage(img, 0, 0); const pd = pc.getContext('2d').getImageData(0, 0, PW, PH).data;
    const W = 1600, H = 1200, quad = [[330, 160], [1360, 250], [1440, 1050], [210, 990]];
    const Hm = homography(quad, [[0, 0], [PW, 0], [PW, PH], [0, PH]]);           // photo pixel -> page pixel
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), id = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = Hm[6] * x + Hm[7] * y + 1, u = Math.round((Hm[0] * x + Hm[1] * y + Hm[2]) / z), v = Math.round((Hm[3] * x + Hm[4] * y + Hm[5]) / z), o = (y * W + x) * 4;
      const light = 0.75 + 0.25 * x / W;                                              // uneven light, like a lamp to one side
      if (u >= 0 && v >= 0 && u < PW && v < PH) { const q = (v * PW + u) * 4; id.data[o] = pd[q] * light; id.data[o + 1] = pd[q + 1] * light * 0.95; id.data[o + 2] = pd[q + 2] * light * 0.85; }
      else { id.data[o] = 70; id.data[o + 1] = 52; id.data[o + 2] = 38; }
      id.data[o + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    const photo = c.toDataURL('image/jpeg', 0.9);
    const out = straightenPage(c);
    return { photo, out: out && out.toDataURL('image/jpeg', 0.85), size: out && [out.width, out.height], expectAspect: (PW / PH).toFixed(3), gotAspect: out && (out.width / out.height).toFixed(3) };
  }, page);
  fs.writeFileSync('/tmp/scan-photo.jpg', Buffer.from(r.photo.split(',')[1], 'base64'));
  if (r.out) fs.writeFileSync('/tmp/scan-straight.jpg', Buffer.from(r.out.split(',')[1], 'base64'));
  console.log('1. straightened:', JSON.stringify({ size: r.size, expectAspect: r.expectAspect, gotAspect: r.gotAspect }));
  // and the photo goes into the drawing tracer
  await p.setInputFiles('#camIn', '/tmp/scan-photo.jpg'); await p.waitForTimeout(4000);
  console.log('   photo -> design:', await p.textContent('#fileName'));
  await p.check('#zoom'); await p.waitForTimeout(300); await p.locator('.view').screenshot({ path: '/tmp/scan-traced.png' });

  // 2. job file round trip gives identical cutting instructions
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.selectOption('#projectSel', 'plaque'); await p.click('#wizBtns >> text=Make it'); await p.waitForTimeout(2500);
  const same = await p.evaluate(() => {
    const before = EasyCarve.buildJob().ops.map(o => o.text).join('');
    const file = JSON.stringify(EasyCarve.serializeJob());
    EasyCarve.items().splice(0); EasyCarve.loadJob(JSON.parse(file));
    const after = EasyCarve.buildJob().ops.map(o => o.text).join('');
    return { same: before === after, kb: Math.round(file.length / 1024), pieces: EasyCarve.items().length };
  });
  console.log('2. save/open job file:', JSON.stringify(same));

  // 3. diary: start + end an entry, then "Do this again"
  await p.evaluate(() => { const J = EasyCarve.buildJob(); const id = diaryStart(J, J.ops[0], 1); diaryEnd(id, true, Date.now() - 23 * 60000); });
  console.log('3. diary:', JSON.stringify(await p.evaluate(() => EasyCarve.diaryLoad().map(e => ({ title: e.title.slice(0, 40), result: e.result, est: e.est, took: e.took, saved: !!e.job })))));
  await p.evaluate(() => EasyCarve.items().splice(0));
  await p.click('#diaryList >> text=Do this again'); await p.waitForTimeout(1200);
  console.log('   do this again -> pieces:', await p.evaluate(() => EasyCarve.items().map(i => i.name)));
  await p.fill('#diaryList textarea', 'Lovely – oiled with Danish oil'); await p.dispatchEvent('#diaryList textarea', 'change');
  console.log('   note saved:', await p.evaluate(() => EasyCarve.diaryLoad()[0].notes));
  await p.locator('.step').nth(3).screenshot({ path: '/tmp/diary-panel.png' });

  // 4. finished alert flashes the title
  await p.evaluate(() => EasyCarve.announce(true, 'Name plaque')); await p.waitForTimeout(1000);
  console.log('4. title while flashing:', await p.title());
  console.log('errors', errs.filter(e => !/ERR_FILE_NOT_FOUND/.test(e))); await b.close();
})();
