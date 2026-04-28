# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-device.spec.js >> Mobile Device: iOS Safari & Android Chrome >> should handle touch interactions
- Location: tests\e2e\mobile-device.spec.js:49:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.textContent: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#pat-count')

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
  4   |  * Mobile Device E2E Tests for TrashMatch
  5   |  * 
  6   |  * Tests the application on mobile devices (iOS Safari and Android Chrome):
  7   |  * 1. Responsive design verification
  8   |  * 2. Touch interaction testing
  9   |  * 3. Mobile-specific UI elements
  10  |  * 4. Complete user flow on mobile
  11  |  * 
  12  |  * Validates: Requirements 7.6
  13  |  */
  14  | 
  15  | // Test setup: Initialize before each test
  16  | test.beforeEach(async ({ page }) => {
  17  |   // Navigate to the application
  18  |   await page.goto('/');
  19  |   
  20  |   // Wait for the page to load
  21  |   await page.waitForLoadState('domcontentloaded');
  22  |   await page.waitForTimeout(500);
  23  | });
  24  | 
  25  | test.describe('Mobile Device: iOS Safari & Android Chrome', () => {
  26  |   test('should load home page correctly on mobile', async ({ page, browserName }) => {
  27  |     console.log(`\n📱 Testing home page on mobile: ${browserName}`);
  28  |     
  29  |     // Verify page loads
  30  |     await expect(page.locator('body')).toBeVisible();
  31  |     
  32  |     // Verify key elements are visible and accessible
  33  |     const storyCard = page.locator('#story-card');
  34  |     await expect(storyCard).toBeVisible();
  35  |     
  36  |     const patButton = page.locator('#pat-btn');
  37  |     await expect(patButton).toBeVisible();
  38  |     
  39  |     const nextButton = page.locator('#next-btn');
  40  |     await expect(nextButton).toBeVisible();
  41  |     
  42  |     // Verify navigation is accessible
  43  |     const postLink = page.locator('a[data-page="post"]');
  44  |     await expect(postLink).toBeVisible();
  45  |     
  46  |     console.log('✅ Home page loaded successfully on mobile');
  47  |   });
  48  | 
  49  |   test('should handle touch interactions', async ({ page, browserName }) => {
  50  |     console.log(`\n👆 Testing touch interactions on: ${browserName}`);
  51  |     
  52  |     // Test tap on pat button
  53  |     const patButton = page.locator('#pat-btn');
> 54  |     const patCountBefore = await page.locator('#pat-count').textContent();
      |                                                             ^ Error: locator.textContent: Test timeout of 30000ms exceeded.
  55  |     
  56  |     // Simulate touch tap
  57  |     await patButton.tap();
  58  |     await page.waitForTimeout(1000);
  59  |     
  60  |     const patCountAfter = await page.locator('#pat-count').textContent();
  61  |     expect(parseInt(patCountAfter)).toBeGreaterThan(parseInt(patCountBefore));
  62  |     
  63  |     console.log('✅ Touch tap on pat button works');
  64  |     
  65  |     // Test tap on next button
  66  |     const nextButton = page.locator('#next-btn');
  67  |     await nextButton.tap();
  68  |     await page.waitForTimeout(1000);
  69  |     
  70  |     // Verify new story loaded
  71  |     await expect(storyCard).toBeVisible();
  72  |     
  73  |     console.log('✅ Touch tap on next button works');
  74  |   });
  75  | 
  76  |   test('should display responsive layout', async ({ page, browserName }) => {
  77  |     console.log(`\n📐 Testing responsive layout on: ${browserName}`);
  78  |     
  79  |     // Verify viewport is mobile-sized
  80  |     const viewport = page.viewportSize();
  81  |     console.log(`  Viewport: ${viewport.width}x${viewport.height}`);
  82  |     
  83  |     // Verify elements are properly sized for mobile
  84  |     const storyCard = page.locator('#story-card');
  85  |     const cardBox = await storyCard.boundingBox();
  86  |     
  87  |     // Card should not overflow viewport
  88  |     expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
  89  |     
  90  |     // Verify buttons are touch-friendly (minimum 44x44 pixels)
  91  |     const patButton = page.locator('#pat-btn');
  92  |     const patBox = await patButton.boundingBox();
  93  |     expect(patBox.height).toBeGreaterThanOrEqual(44);
  94  |     
  95  |     console.log('✅ Responsive layout verified');
  96  |     
  97  |     // Take screenshot
  98  |     await page.screenshot({ 
  99  |       path: `playwright-report/screenshots/${browserName}-mobile-layout.png`,
  100 |       fullPage: true 
  101 |     });
  102 |   });
  103 | 
  104 |   test('should navigate to post page on mobile', async ({ page, browserName }) => {
  105 |     console.log(`\n📝 Testing post page navigation on: ${browserName}`);
  106 |     
  107 |     // Tap on post link
  108 |     const postLink = page.locator('a[data-page="post"]');
  109 |     await postLink.tap();
  110 |     await page.waitForTimeout(500);
  111 |     
  112 |     // Verify post page is displayed
  113 |     const postPage = page.locator('#post-page');
  114 |     await expect(postPage).not.toHaveClass(/hidden/);
  115 |     
  116 |     // Verify form elements are visible
  117 |     const postInput = page.locator('#post-input');
  118 |     await expect(postInput).toBeVisible();
  119 |     
  120 |     const postSubmit = page.locator('#post-submit');
  121 |     await expect(postSubmit).toBeVisible();
  122 |     
  123 |     console.log('✅ Post page navigation works on mobile');
  124 |     
  125 |     // Take screenshot
  126 |     await page.screenshot({ 
  127 |       path: `playwright-report/screenshots/${browserName}-mobile-post.png`,
  128 |       fullPage: true 
  129 |     });
  130 |   });
  131 | 
  132 |   test('should complete pat flow on mobile', async ({ page, browserName }) => {
  133 |     console.log(`\n👏 Testing pat flow on mobile: ${browserName}`);
  134 |     
  135 |     const patButton = page.locator('#pat-btn');
  136 |     const patCountElement = page.locator('#pat-count');
  137 |     
  138 |     // Pat 3 times using touch
  139 |     for (let i = 1; i <= 3; i++) {
  140 |       console.log(`  Pat ${i}/3...`);
  141 |       await patButton.tap();
  142 |       await page.waitForTimeout(1000);
  143 |       
  144 |       const patCount = await patCountElement.textContent();
  145 |       console.log(`  Current pat count: ${patCount}`);
  146 |     }
  147 |     
  148 |     // Wait for chat room to potentially open
  149 |     await page.waitForTimeout(1500);
  150 |     
  151 |     // Check if chat room opened
  152 |     const chatPanel = page.locator('#chat-panel');
  153 |     const isChatVisible = await chatPanel.isVisible();
  154 |     
```