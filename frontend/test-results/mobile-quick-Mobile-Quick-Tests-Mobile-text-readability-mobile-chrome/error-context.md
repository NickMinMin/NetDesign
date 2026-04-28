# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-quick.spec.js >> Mobile Quick Tests >> Mobile text readability
- Location: tests\e2e\mobile-quick.spec.js:141:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#story-content')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"message\": \"TrashMatch API is running\" }"
```

# Test source

```ts
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
  124 |     
  125 |     // Tap post link
  126 |     const postLink = page.locator('a[data-page="post"]');
  127 |     await postLink.tap();
  128 |     await page.waitForTimeout(500);
  129 |     
  130 |     // Verify post page displayed
  131 |     const postPage = page.locator('#post-page');
  132 |     await expect(postPage).not.toHaveClass(/hidden/);
  133 |     
  134 |     // Verify form elements visible
  135 |     await expect(page.locator('#post-input')).toBeVisible();
  136 |     await expect(page.locator('#post-submit')).toBeVisible();
  137 |     
  138 |     console.log('✅ Mobile navigation verified');
  139 |   });
  140 | 
  141 |   test('Mobile text readability', async ({ page }) => {
  142 |     console.log('\n📖 Testing mobile text readability');
  143 |     
  144 |     await page.goto('/');
  145 |     await page.waitForLoadState('domcontentloaded');
  146 |     
  147 |     // Check story content font size
  148 |     const storyContent = page.locator('#story-content');
> 149 |     const fontSize = await storyContent.evaluate(el => {
      |                                         ^ Error: locator.evaluate: Test timeout of 30000ms exceeded.
  150 |       return window.getComputedStyle(el).fontSize;
  151 |     });
  152 |     
  153 |     console.log(`  Story font size: ${fontSize}`);
  154 |     
  155 |     // Font should be at least 14px for mobile readability
  156 |     const fontSizeNum = parseInt(fontSize);
  157 |     expect(fontSizeNum).toBeGreaterThanOrEqual(14);
  158 |     
  159 |     console.log('✅ Mobile text readability verified');
  160 |   });
  161 | });
  162 | 
```