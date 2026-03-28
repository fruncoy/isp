const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER_CONSOLE_ERROR:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('BROWSER_PAGE_ERROR:', error.message);
    });

    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('Waiting 3 seconds for React to mount...');
    await new Promise(r => setTimeout(r, 3000));
    
    await browser.close();
    console.log('Finished checking.');
  } catch (error) {
    console.error('PUPPETEER_SCRIPT_ERROR:', error);
  }
})();
