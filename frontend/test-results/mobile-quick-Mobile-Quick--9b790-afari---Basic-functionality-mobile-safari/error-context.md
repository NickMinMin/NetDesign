# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-quick.spec.js >> Mobile Quick Tests >> iOS Safari - Basic functionality
- Location: tests\e2e\mobile-quick.spec.js:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#story-card')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#story-card')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"message\": \"TrashMatch API is running\" }"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Quick Mobile Device Tests for TrashMatch
  5   |  * 
  6   |  * Simplified mobile tests that run quickly to verify basic mobile functionality
  7   |  * 
  8   |  * Validates: Requirements 7.6
  9   |  */
  10  | 
  11  | test.describe('Mobile Quick Tests', () => {
  12  |   test('iOS Safari - Basic functionality', async ({ page, browserName }) => {
  13  |     // Only run on mobile-safari project
  14  |     test.skip(browserName !== 'webkit', 'iOS Safari test');
  15  |     
  16  |     console.log('\n📱 Testing iOS Safari basic functionality');
  17  |     
  18  |     await page.goto('/');
  19  |     await page.waitForLoadState('domcontentloaded');
  20  |     
  21  |     // Verify page loads
  22  |     await expect(page.locator('body')).toBeVisible();
> 23  |     await expect(page.locator('#story-card')).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  24  |     
  25  |     // Verify touch-friendly elements
  26  |     const patButton = page.locator('#pat-btn');
  27  |     await expect(patButton).toBeVisible();
  28  |     
  29  |     // Check button size (should be touch-friendly)
  30  |     const buttonBox = await patButton.boundingBox();
  31  |     expect(buttonBox.height).toBeGreaterThanOrEqual(40);
  32  |     
  33  |     // Take screenshot
  34  |     await page.screenshot({ 
  35  |       path: 'playwright-report/screenshots/ios-safari-mobile.png',
  36  |       fullPage: true 
  37  |     });
  38  |     
  39  |     console.log('✅ iOS Safari basic functionality verified');
  40  |   });
  41  | 
  42  |   test('Android Chrome - Basic functionality', async ({ page, browserName }) => {
  43  |     // Only run on mobile-chrome project
  44  |     test.skip(browserName !== 'chromium', 'Android Chrome test');
  45  |     
  46  |     console.log('\n📱 Testing Android Chrome basic functionality');
  47  |     
  48  |     await page.goto('/');
  49  |     await page.waitForLoadState('domcontentloaded');
  50  |     
  51  |     // Verify page loads
  52  |     await expect(page.locator('body')).toBeVisible();
  53  |     await expect(page.locator('#story-card')).toBeVisible();
  54  |     
  55  |     // Verify touch-friendly elements
  56  |     const patButton = page.locator('#pat-btn');
  57  |     await expect(patButton).toBeVisible();
  58  |     
  59  |     // Check button size (should be touch-friendly)
  60  |     const buttonBox = await patButton.boundingBox();
  61  |     expect(buttonBox.height).toBeGreaterThanOrEqual(40);
  62  |     
  63  |     // Take screenshot
  64  |     await page.screenshot({ 
  65  |       path: 'playwright-report/screenshots/android-chrome-mobile.png',
  66  |       fullPage: true 
  67  |     });
  68  |     
  69  |     console.log('✅ Android Chrome basic functionality verified');
  70  |   });
  71  | 
  72  |   test('Mobile responsive layout', async ({ page }) => {
  73  |     console.log('\n📐 Testing mobile responsive layout');
  74  |     
  75  |     await page.goto('/');
  76  |     await page.waitForLoadState('domcontentloaded');
  77  |     
  78  |     // Get viewport size
  79  |     const viewport = page.viewportSize();
  80  |     console.log(`  Viewport: ${viewport.width}x${viewport.height}`);
  81  |     
  82  |     // Verify no horizontal overflow
  83  |     const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  84  |     expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1); // +1 for rounding
  85  |     
  86  |     // Verify story card fits
  87  |     const storyCard = page.locator('#story-card');
  88  |     const cardBox = await storyCard.boundingBox();
  89  |     expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
  90  |     
  91  |     console.log('✅ Mobile responsive layout verified');
  92  |   });
  93  | 
  94  |   test('Mobile touch interaction', async ({ page }) => {
  95  |     console.log('\n👆 Testing mobile touch interaction');
  96  |     
  97  |     await page.goto('/');
  98  |     await page.waitForLoadState('domcontentloaded');
  99  |     await page.waitForTimeout(500);
  100 |     
  101 |     // Get initial pat count
  102 |     const patCountBefore = await page.locator('#pat-count').textContent();
  103 |     console.log(`  Initial pat count: ${patCountBefore}`);
  104 |     
  105 |     // Tap pat button
  106 |     const patButton = page.locator('#pat-btn');
  107 |     await patButton.tap();
  108 |     await page.waitForTimeout(1500);
  109 |     
  110 |     // Verify pat count increased
  111 |     const patCountAfter = await page.locator('#pat-count').textContent();
  112 |     console.log(`  After tap pat count: ${patCountAfter}`);
  113 |     
  114 |     expect(parseInt(patCountAfter)).toBeGreaterThanOrEqual(parseInt(patCountBefore));
  115 |     
  116 |     console.log('✅ Mobile touch interaction verified');
  117 |   });
  118 | 
  119 |   test('Mobile navigation', async ({ page }) => {
  120 |     console.log('\n🧭 Testing mobile navigation');
  121 |     
  122 |     await page.goto('/');
  123 |     await page.waitForLoadState('domcontentloaded');
```