import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Catch all console logs from the browser
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:5173/');
    
    // Wait for 5 seconds to let data arrive
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: 'screenshot_dashboard.png' });
    console.log("Screenshot saved.");
    
    await browser.close();
})();
