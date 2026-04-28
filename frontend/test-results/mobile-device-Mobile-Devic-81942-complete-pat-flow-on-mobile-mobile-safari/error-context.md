# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-device.spec.js >> Mobile Device: iOS Safari & Android Chrome >> should complete pat flow on mobile
- Location: tests\e2e\mobile-device.spec.js:132:3

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
  54  |     const patCountBefore = await page.locator('#pat-count').textContent();
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
> 141 |       await patButton.tap();
      |                       ^ Error: locator.tap: Test timeout of 30000ms exceeded.
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
  155 |     if (isChatVisible) {
  156 |       console.log('✅ Chat room opened on mobile');
  157 |       
  158 |       // Verify chat room is properly sized for mobile
  159 |       const chatBox = await chatPanel.boundingBox();
  160 |       const viewport = page.viewportSize();
  161 |       
  162 |       // Chat panel should fit within viewport
  163 |       expect(chatBox.width).toBeLessThanOrEqual(viewport.width);
  164 |       
  165 |       // Take screenshot of chat room on mobile
  166 |       await page.screenshot({ 
  167 |         path: `playwright-report/screenshots/${browserName}-mobile-chat.png`,
  168 |         fullPage: true 
  169 |       });
  170 |     } else {
  171 |       console.log('ℹ️ Chat room did not open (may need specific story)');
  172 |     }
  173 |     
  174 |     console.log('✅ Pat flow completed on mobile');
  175 |   });
  176 | 
  177 |   test('should handle chat input on mobile', async ({ page, browserName }) => {
  178 |     console.log(`\n💬 Testing chat input on mobile: ${browserName}`);
  179 |     
  180 |     // First, try to unlock chat by patting 3 times
  181 |     const patButton = page.locator('#pat-btn');
  182 |     
  183 |     for (let i = 1; i <= 3; i++) {
  184 |       await patButton.tap();
  185 |       await page.waitForTimeout(1000);
  186 |     }
  187 |     
  188 |     await page.waitForTimeout(1500);
  189 |     
  190 |     // Check if chat room is visible
  191 |     const chatPanel = page.locator('#chat-panel');
  192 |     const isChatVisible = await chatPanel.isVisible();
  193 |     
  194 |     if (isChatVisible) {
  195 |       console.log('  Chat room is open, testing input...');
  196 |       
  197 |       // Test chat input
  198 |       const chatInput = page.locator('#chat-input');
  199 |       await expect(chatInput).toBeVisible();
  200 |       
  201 |       // Tap on input to focus (simulates mobile keyboard)
  202 |       await chatInput.tap();
  203 |       await page.waitForTimeout(500);
  204 |       
  205 |       // Type message
  206 |       const testMessage = `Mobile test from ${browserName}`;
  207 |       await chatInput.fill(testMessage);
  208 |       
  209 |       // Tap send button
  210 |       const sendButton = page.locator('#chat-send-btn');
  211 |       await sendButton.tap();
  212 |       await page.waitForTimeout(1500);
  213 |       
  214 |       // Verify message appears
  215 |       const chatMessages = page.locator('#chat-messages');
  216 |       await expect(chatMessages).toContainText(testMessage);
  217 |       
  218 |       console.log('✅ Chat input works on mobile');
  219 |     } else {
  220 |       console.log('ℹ️ Chat room not available for this test');
  221 |     }
  222 |   });
  223 | 
  224 |   test('should handle scrolling on mobile', async ({ page, browserName }) => {
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
```