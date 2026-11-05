const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
(async () => {
  const srv = http.createServer((req, res) => {
    res.setHeader('Set-Cookie', ['a=1; Path=/', 'sid=xyz; HttpOnly; Path=/', 'deep=2; Path=/sub',
      'persist=3; Max-Age=3600; Path=/', 'chips=p; Secure; SameSite=None; Partitioned; Path=/']);
    res.end('ok');
  }).listen(8767);
  const ext = require('path').resolve(__dirname, '..');
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium', headless: true, acceptDownloads: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const site = await ctx.newPage();
  await site.goto('http://localhost:8767/');
  const tmp = await ctx.newPage();
  await tmp.goto('chrome://extensions');
  const id = await tmp.evaluate(async () => (await chrome.management.getAll()).find(e => e.name === 'Cookie Export').id);
  await tmp.close();

  // A popup opened as a tab would see itself as the active tab, so point
  // tabs.query({active}) at a chosen tab URL before popup.js runs.
  async function openPopup(targetUrl) {
    const p = await ctx.newPage();
    p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
    await p.addInitScript((u) => {
      const orig = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async (q) => {
        const tabs = await orig({});
        if (q && q.active) return [tabs.find(t => t.url === u) || { id: -1, url: u }];
        return orig(q);
      };
      const w = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = async (t) => { window.__clip = t; try { await w(t); window.__clipReal = true; } catch (e) { window.__clipErr = String(e); throw e; } };
    }, targetUrl);
    await p.goto(`chrome-extension://${id}/popup.html`);
    return p;
  }

  const p = await openPopup('http://localhost:8767/');
  await p.waitForSelector('#list li');
  const names = () => p.$$eval('#list .name', els => els.map(e => e.firstChild.textContent));
  ok((await names()).sort().join() === 'a,chips,persist,sid', 'lists 4 cookies for URL scope: ' + await names());
  ok(await p.textContent('#count') === '4 of 4 selected', 'all selected by default');
  ok(await p.$eval('#list', l => l.innerText.includes('HttpOnly') && l.innerText.includes('Partitioned')), 'shows HttpOnly/Partitioned tags');
  ok(await p.$eval('#selectAll', e => e.checked && !e.indeterminate), 'select-all checked');

  // untick sid
  const row = (n) => p.locator('#list li', { has: p.locator('.name', { hasText: new RegExp('^' + n) }) }).locator('input');
  await row('sid').uncheck();
  ok(await p.textContent('#count') === '3 of 4 selected', 'untick sid -> 3 of 4');
  ok(await p.$eval('#selectAll', e => e.indeterminate), 'select-all indeterminate');

  // copy header
  await p.selectOption('#format', 'header');
  await p.bringToFront();
  await p.click('#copy');
  await p.waitForFunction(() => document.querySelector('#status').textContent);
  const clip = await p.evaluate(() => window.__clip);
  console.log('  real clipboard write ok:', await p.evaluate(() => window.__clipReal || window.__clipErr));
  ok(!clip.includes('sid=') && clip.includes('a=1') && clip.includes('persist=3') && clip.includes('chips=p'), 'copied header excludes sid: ' + clip);
  ok((await p.textContent('#status')).startsWith('Copied 3'), 'status says copied 3');

  // download JSON
  await p.selectOption('#format', 'json');
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
  let data = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  ok(data.length === 3 && !data.some(c => c.name === 'sid'), 'downloaded JSON has 3 cookies, no sid');
  ok(/^localhost_cookies_.*\.json$/.test(dl.suggestedFilename()), 'filename ' + dl.suggestedFilename());

  // filter + select-all on visible only
  await p.fill('#filter', 'pers');
  ok((await names()).join() === 'persist', 'filter shows only persist');
  await p.uncheck('#selectAll');
  await p.fill('#filter', '');
  ok(await p.textContent('#count') === '2 of 4 selected', 'select-all off on filtered set only affects visible');
  await p.fill('#filter', 'zzz');
  ok(await p.isVisible('#empty') && (await p.textContent('#empty')).includes('match'), 'no-match message');
  await p.fill('#filter', '');

  // whole-domain scope keeps exclusions, adds /sub cookie
  await p.check('#wholeDomain');
  await p.waitForFunction(() => document.querySelectorAll('#list li').length === 5);
  ok(await p.textContent('#count') === '3 of 5 selected', 'whole-domain adds deep, keeps exclusions: ' + await p.textContent('#count'));

  // netscape download
  await p.selectOption('#format', 'netscape');
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('#download')]);
  const txt = fs.readFileSync(await dl.path(), 'utf8');
  const rows = txt.split('\n').filter(l => l && (!l.startsWith('#') || l.startsWith('#HttpOnly_')));
  ok(rows.length === 3 && rows.every(r => r.split('\t').length === 7) && !txt.includes('sid'), 'netscape file: 3 rows x 7 fields, no sid');

  // preview matches selection
  await p.click('#previewBox summary');
  ok((await p.inputValue('#output')).trim() === txt.trim(), 'preview matches downloaded file');

  // deselect all -> disabled buttons
  await p.click('#selectAll');
  ok(await p.textContent('#count') === '5 of 5 selected', 'click on indeterminate select-all selects all');
  await p.click('#selectAll');
  ok(await p.textContent('#count') === '0 of 5 selected', 'second click deselects all');
  ok(await p.isDisabled('#copy') && await p.isDisabled('#download'), 'buttons disabled with nothing selected');
  await p.check('#selectAll');
  ok(await p.textContent('#count') === '5 of 5 selected', 'select all again');

  await p.setViewportSize({ width: 420, height: 640 });
  

  // prefs persisted
  const p3 = await openPopup('http://localhost:8767/');
  await p3.waitForSelector('#list li');
  ok(await p3.inputValue('#format') === 'netscape' && await p3.isChecked('#wholeDomain'), 'prefs remembered across opens');

  // non-http tab
  const p2 = await openPopup('chrome://newtab/');
  await p2.waitForFunction(() => document.querySelector('#status').textContent);
  ok(await p2.isDisabled('#download') && (await p2.textContent('#status')).includes('http(s)'), 'non-http tab disabled');

  await ctx.close(); srv.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
