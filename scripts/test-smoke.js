const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const fileUrl = 'file://' + path.join(root, 'globe.html');
  console.log('Loading', fileUrl);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push({type:'pageerror', message: err.message}));
  page.on('console', msg => {
    if(msg.type() === 'error') errors.push({type:'console', message: msg.text()});
    console.log('[PAGE]', msg.type(), msg.text());
  });

  try {
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 20000 });

    // wait for canvas to appear
    await page.waitForSelector('canvas', { timeout: 10000 });

    // take a small screenshot
    await page.screenshot({ path: path.join(root, 'smoke-snap.png'), fullPage: false });

    // query for markers count
    const markerCount = await page.evaluate(() => {
      const groups = window?.globeMarkersCount || null;
      if(groups) return groups;

      // fallback: try to infer from DOM script (not ideal)
      return document.querySelectorAll('.place').length;
    });

    console.log('Markers (inferred):', markerCount);

  } catch (err) {
    console.error('Test error', err.message);
    errors.push({type:'test', message: err.message});
  } finally {
    await browser.close();
  }

  if(errors.length){
    console.error('Smoke test found errors:');
    errors.forEach(e=>console.error(e.type, e.message));
    process.exit(2);
  }

  console.log('Smoke test passed.');
  process.exit(0);
})();
