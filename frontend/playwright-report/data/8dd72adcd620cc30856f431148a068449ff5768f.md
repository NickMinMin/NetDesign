# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-device.spec.js >> Mobile Device: iOS Safari & Android Chrome >> should handle scrolling on mobile
- Location: tests\e2e\mobile-device.spec.js:224:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.tap: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[data-page="post"]')

```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"message\": \"TrashMatch API is running\" }"
```

# Test source

```ts
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
> 228 |     await page.locator('a[data-page="post"]').tap();
      |                                               ^ Error: locator.tap: Test timeout of 30000ms exceeded.
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
  325 |       await patButton.tap();
  326 |       await page.waitForTimeout(100); // Very short delay
  327 |     }
  328 |     
```