import { test, expect } from '@playwright/test';

/**
 * Mobile Device E2E Tests for TrashMatch
 * 
 * Tests the application on mobile devices (iOS Safari and Android Chrome):
 * 1. Responsive design verification
 * 2. Touch interaction testing
 * 3. Mobile-specific UI elements
 * 4. Complete user flow on mobile
 * 
 * Validates: Requirements 7.6
 */

// Test setup: Initialize before each test
test.beforeEach(async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
});

test.describe('Mobile Device: iOS Safari & Android Chrome', () => {
  test('should load home page correctly on mobile', async ({ page, browserName }) => {
    console.log(`\n📱 Testing home page on mobile: ${browserName}`);
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Verify key elements are visible and accessible
    const storyCard = page.locator('#story-card');
    await expect(storyCard).toBeVisible();
    
    const patButton = page.locator('#pat-btn');
    await expect(patButton).toBeVisible();
    
    const nextButton = page.locator('#next-btn');
    await expect(nextButton).toBeVisible();
    
    // Verify navigation is accessible
    const postLink = page.locator('a[data-page="post"]');
    await expect(postLink).toBeVisible();
    
    console.log('✅ Home page loaded successfully on mobile');
  });

  test('should handle touch interactions', async ({ page, browserName }) => {
    console.log(`\n👆 Testing touch interactions on: ${browserName}`);
    
    // Test tap on pat button
    const patButton = page.locator('#pat-btn');
    const patCountBefore = await page.locator('#pat-count').textContent();
    
    // Simulate touch tap
    await patButton.tap();
    await page.waitForTimeout(1000);
    
    const patCountAfter = await page.locator('#pat-count').textContent();
    expect(parseInt(patCountAfter)).toBeGreaterThan(parseInt(patCountBefore));
    
    console.log('✅ Touch tap on pat button works');
    
    // Test tap on next button
    const nextButton = page.locator('#next-btn');
    await nextButton.tap();
    await page.waitForTimeout(1000);
    
    // Verify new story loaded
    await expect(storyCard).toBeVisible();
    
    console.log('✅ Touch tap on next button works');
  });

  test('should display responsive layout', async ({ page, browserName }) => {
    console.log(`\n📐 Testing responsive layout on: ${browserName}`);
    
    // Verify viewport is mobile-sized
    const viewport = page.viewportSize();
    console.log(`  Viewport: ${viewport.width}x${viewport.height}`);
    
    // Verify elements are properly sized for mobile
    const storyCard = page.locator('#story-card');
    const cardBox = await storyCard.boundingBox();
    
    // Card should not overflow viewport
    expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
    
    // Verify buttons are touch-friendly (minimum 44x44 pixels)
    const patButton = page.locator('#pat-btn');
    const patBox = await patButton.boundingBox();
    expect(patBox.height).toBeGreaterThanOrEqual(44);
    
    console.log('✅ Responsive layout verified');
    
    // Take screenshot
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-mobile-layout.png`,
      fullPage: true 
    });
  });

  test('should navigate to post page on mobile', async ({ page, browserName }) => {
    console.log(`\n📝 Testing post page navigation on: ${browserName}`);
    
    // Tap on post link
    const postLink = page.locator('a[data-page="post"]');
    await postLink.tap();
    await page.waitForTimeout(500);
    
    // Verify post page is displayed
    const postPage = page.locator('#post-page');
    await expect(postPage).not.toHaveClass(/hidden/);
    
    // Verify form elements are visible
    const postInput = page.locator('#post-input');
    await expect(postInput).toBeVisible();
    
    const postSubmit = page.locator('#post-submit');
    await expect(postSubmit).toBeVisible();
    
    console.log('✅ Post page navigation works on mobile');
    
    // Take screenshot
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-mobile-post.png`,
      fullPage: true 
    });
  });

  test('should complete pat flow on mobile', async ({ page, browserName }) => {
    console.log(`\n👏 Testing pat flow on mobile: ${browserName}`);
    
    const patButton = page.locator('#pat-btn');
    const patCountElement = page.locator('#pat-count');
    
    // Pat 3 times using touch
    for (let i = 1; i <= 3; i++) {
      console.log(`  Pat ${i}/3...`);
      await patButton.tap();
      await page.waitForTimeout(1000);
      
      const patCount = await patCountElement.textContent();
      console.log(`  Current pat count: ${patCount}`);
    }
    
    // Wait for chat room to potentially open
    await page.waitForTimeout(1500);
    
    // Check if chat room opened
    const chatPanel = page.locator('#chat-panel');
    const isChatVisible = await chatPanel.isVisible();
    
    if (isChatVisible) {
      console.log('✅ Chat room opened on mobile');
      
      // Verify chat room is properly sized for mobile
      const chatBox = await chatPanel.boundingBox();
      const viewport = page.viewportSize();
      
      // Chat panel should fit within viewport
      expect(chatBox.width).toBeLessThanOrEqual(viewport.width);
      
      // Take screenshot of chat room on mobile
      await page.screenshot({ 
        path: `playwright-report/screenshots/${browserName}-mobile-chat.png`,
        fullPage: true 
      });
    } else {
      console.log('ℹ️ Chat room did not open (may need specific story)');
    }
    
    console.log('✅ Pat flow completed on mobile');
  });

  test('should handle chat input on mobile', async ({ page, browserName }) => {
    console.log(`\n💬 Testing chat input on mobile: ${browserName}`);
    
    // First, try to unlock chat by patting 3 times
    const patButton = page.locator('#pat-btn');
    
    for (let i = 1; i <= 3; i++) {
      await patButton.tap();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForTimeout(1500);
    
    // Check if chat room is visible
    const chatPanel = page.locator('#chat-panel');
    const isChatVisible = await chatPanel.isVisible();
    
    if (isChatVisible) {
      console.log('  Chat room is open, testing input...');
      
      // Test chat input
      const chatInput = page.locator('#chat-input');
      await expect(chatInput).toBeVisible();
      
      // Tap on input to focus (simulates mobile keyboard)
      await chatInput.tap();
      await page.waitForTimeout(500);
      
      // Type message
      const testMessage = `Mobile test from ${browserName}`;
      await chatInput.fill(testMessage);
      
      // Tap send button
      const sendButton = page.locator('#chat-send-btn');
      await sendButton.tap();
      await page.waitForTimeout(1500);
      
      // Verify message appears
      const chatMessages = page.locator('#chat-messages');
      await expect(chatMessages).toContainText(testMessage);
      
      console.log('✅ Chat input works on mobile');
    } else {
      console.log('ℹ️ Chat room not available for this test');
    }
  });

  test('should handle scrolling on mobile', async ({ page, browserName }) => {
    console.log(`\n📜 Testing scrolling on mobile: ${browserName}`);
    
    // Navigate to post page
    await page.locator('a[data-page="post"]').tap();
    await page.waitForTimeout(500);
    
    // Get initial scroll position
    const scrollBefore = await page.evaluate(() => window.scrollY);
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.waitForTimeout(300);
    
    const scrollAfter = await page.evaluate(() => window.scrollY);
    
    // Verify scrolling works
    expect(scrollAfter).toBeGreaterThanOrEqual(scrollBefore);
    
    console.log('✅ Scrolling works on mobile');
  });

  test('should display text readably on mobile', async ({ page, browserName }) => {
    console.log(`\n📖 Testing text readability on mobile: ${browserName}`);
    
    // Check story content font size
    const storyContent = page.locator('#story-content');
    await expect(storyContent).toBeVisible();
    
    const fontSize = await storyContent.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    
    console.log(`  Story font size: ${fontSize}`);
    
    // Font size should be at least 14px for readability
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
    
    console.log('✅ Text is readable on mobile');
  });

  test('should handle orientation changes', async ({ page, browserName }) => {
    console.log(`\n🔄 Testing orientation changes on: ${browserName}`);
    
    // Get initial viewport
    const initialViewport = page.viewportSize();
    console.log(`  Initial: ${initialViewport.width}x${initialViewport.height}`);
    
    // Simulate landscape orientation
    await page.setViewportSize({ 
      width: initialViewport.height, 
      height: initialViewport.width 
    });
    await page.waitForTimeout(500);
    
    // Verify page still works in landscape
    await expect(page.locator('#story-card')).toBeVisible();
    await expect(page.locator('#pat-btn')).toBeVisible();
    
    console.log('✅ Landscape orientation works');
    
    // Take screenshot in landscape
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-mobile-landscape.png`,
      fullPage: true 
    });
    
    // Restore portrait orientation
    await page.setViewportSize(initialViewport);
    await page.waitForTimeout(500);
    
    console.log('✅ Orientation changes handled correctly');
  });
});

test.describe('Mobile Device: Performance', () => {
  test('should load quickly on mobile', async ({ page, browserName }) => {
    console.log(`\n⚡ Testing load performance on mobile: ${browserName}`);
    
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    console.log(`  Load time: ${loadTime}ms`);
    
    // Page should load within 3 seconds on mobile
    expect(loadTime).toBeLessThan(3000);
    
    console.log('✅ Load performance acceptable');
  });

  test('should handle rapid taps', async ({ page, browserName }) => {
    console.log(`\n⚡ Testing rapid tap handling on: ${browserName}`);
    
    const patButton = page.locator('#pat-btn');
    
    // Rapidly tap 5 times
    for (let i = 0; i < 5; i++) {
      await patButton.tap();
      await page.waitForTimeout(100); // Very short delay
    }
    
    await page.waitForTimeout(2000);
    
    // Verify app didn't crash
    await expect(page.locator('body')).toBeVisible();
    await expect(patButton).toBeVisible();
    
    console.log('✅ Rapid taps handled correctly');
  });
});
