# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-device.spec.js >> Mobile Device: Performance >> should handle rapid taps
- Location: tests\e2e\mobile-device.spec.js:318:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.tap: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#pat-btn')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"message\": \"TrashMatch API is running\" }"
```

# Test source

```ts
  225 |     console.log(`\n📜 Testing scrolling on mobile: ${browserName}`);
  226 |     
  227 |     // Navigate to post page
  228 |     await page.locator('a[data-page="post"]').tap();
  229 |     await page.waitForTimeout(500);
  230 |     
  231 |     // Get initial scroll position
  232 |     const scrollBefore = await page.evaluate(() => window.scrollY);
  233 |     
  234 |     // Scroll down
  235 |     await page.evaluate(() => window.scrollBy(0, 100));
  236 |     await page.waitForTimeout(300);
  237 |     
  238 |     const scrollAfter = await page.evaluate(() => window.scrollY);
  239 |     
  240 |     // Verify scrolling works
  241 |     expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore);
  242 |     
  243 |     console.log('✅ Scrolling works on mobile');
  244 |   });
  245 | 
  246 |   test('should display text readably on mobile', async ({ page, browserName }) => {
  247 |     console.log(`\n📖 Testing text readability on mobile: ${browserName}`);
  248 |     
  249 |     // Check story content font size
  250 |     const storyContent = page.locator('#story-content');
  251 |     await expect(storyContent).toBeVisible();
  252 |     
  253 |     const fontSize = await storyContent.evaluate(el => {
  254 |       return window.getComputedStyle(el).fontSize;
  255 |     });
  256 |     
  257 |     console.log(`  Story font size: ${fontSize}`);
  258 |     
  259 |     // Font size should be at least 14px for readability
  260 |     const fontSizeNum = parseInt(fontSize);
  261 |     expect(fontSizeNum).toBeGreaterThanOrEqual(14);
  262 |     
  263 |     console.log('✅ Text is readable on mobile');
  264 |   });
  265 | 
  266 |   test('should handle orientation changes', async ({ page, browserName }) => {
  267 |     console.log(`\n🔄 Testing orientation changes on: ${browserName}`);
  268 |     
  269 |     // Get initial viewport
  270 |     const initialViewport = page.viewportSize();
  271 |     console.log(`  Initial: ${initialViewport.width}x${initialViewport.height}`);
  272 |     
  273 |     // Simulate landscape orientation
  274 |     await page.setViewportSize({ 
  275 |       width: initialViewport.height, 
  276 |       height: initialViewport.width 
  277 |     });
  278 |     await page.waitForTimeout(500);
  279 |     
  280 |     // Verify page still works in landscape
  281 |     await expect(page.locator('#story-card')).toBeVisible();
  282 |     await expect(page.locator('#pat-btn')).toBeVisible();
  283 |     
  284 |     console.log('✅ Landscape orientation works');
  285 |     
  286 |     // Take screenshot in landscape
  287 |     await page.screenshot({ 
  288 |       path: `playwright-report/screenshots/${browserName}-mobile-landscape.png`,
  289 |       fullPage: true 
  290 |     });
  291 |     
  292 |     // Restore portrait orientation
  293 |     await page.setViewportSize(initialViewport);
  294 |     await page.waitForTimeout(500);
  295 |     
  296 |     console.log('✅ Orientation changes handled correctly');
  297 |   });
  298 | });
  299 | 
  300 | test.describe('Mobile Device: Performance', () => {
  301 |   test('should load quickly on mobile', async ({ page, browserName }) => {
  302 |     console.log(`\n⚡ Testing load performance on mobile: ${browserName}`);
  303 |     
  304 |     const startTime = Date.now();
  305 |     
  306 |     await page.goto('/');
  307 |     await page.waitForLoadState('domcontentloaded');
  308 |     
  309 |     const loadTime = Date.now() - startTime;
  310 |     console.log(`  Load time: ${loadTime}ms`);
  311 |     
  312 |     // Page should load within 3 seconds on mobile
  313 |     expect(loadTime).toBeLessThan(3000);
  314 |     
  315 |     console.log('✅ Load performance acceptable');
  316 |   });
  317 | 
  318 |   test('should handle rapid taps', async ({ page, browserName }) => {
  319 |     console.log(`\n⚡ Testing rapid tap handling on: ${browserName}`);
  320 |     
  321 |     const patButton = page.locator('#pat-btn');
  322 |     
  323 |     // Rapidly tap 5 times
  324 |     for (let i = 0; i < 5; i++) {
> 325 |       await patButton.tap();
      |                       ^ Error: locator.tap: Test timeout of 30000ms exceeded.
  326 |       await page.waitForTimeout(100); // Very short delay
  327 |     }
  328 |     
  329 |     await page.waitForTimeout(2000);
  330 |     
  331 |     // Verify app didn't crash
  332 |     await expect(page.locator('body')).toBeVisible();
  333 |     await expect(patButton).toBeVisible();
  334 |     
  335 |     console.log('✅ Rapid taps handled correctly');
  336 |   });
  337 | });
  338 | 
```