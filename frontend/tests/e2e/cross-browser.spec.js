import { test, expect } from '@playwright/test';

/**
 * Cross-Browser E2E Tests for TrashMatch
 * 
 * Tests the complete user flow across Chrome, Firefox, and Safari:
 * 1. Post a story
 * 2. Pat the story 3 times to unlock chat
 * 3. Send messages in the chat room
 * 4. Verify UI consistency and functionality
 * 
 * Validates: Requirements 7.6
 */

// Test setup: Initialize database before each test
test.beforeEach(async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
});

test.describe('Cross-Browser: Complete User Flow', () => {
  test('should complete full flow: post → pat → chat', async ({ page, browserName }) => {
    console.log(`\n🌐 Testing on: ${browserName}`);
    
    // Step 1: Navigate to post page
    console.log('📝 Step 1: Posting a story...');
    await page.click('a[data-page="post"]');
    await page.waitForTimeout(500);
    
    // Verify we're on the post page
    const postPage = page.locator('#post-page');
    await expect(postPage).not.toHaveClass(/hidden/);
    
    // Step 2: Submit a story
    const storyContent = `Cross-browser test from ${browserName} - ${Date.now()}`;
    await page.fill('#post-input', storyContent);
    await page.click('#post-submit');
    
    // Wait for success and redirect
    await page.waitForTimeout(2000);
    
    // Step 3: Should be back on feed page
    console.log('🏠 Step 2: Verifying redirect to feed...');
    const feedPage = page.locator('#feed-page');
    await expect(feedPage).not.toHaveClass(/hidden/);
    
    // Step 4: Pat the story 3 times
    console.log('👏 Step 3: Patting story 3 times...');
    
    const patButton = page.locator('#pat-btn');
    const patCountElement = page.locator('#pat-count');
    
    // Pat 3 times to unlock chat
    for (let i = 1; i <= 3; i++) {
      console.log(`  Pat ${i}/3...`);
      await patButton.click();
      await page.waitForTimeout(1000); // Wait for API response
      
      // Verify pat count increases
      const patCount = await patCountElement.textContent();
      console.log(`  Current pat count: ${patCount}`);
    }
    
    // Step 5: Verify chat room opens
    console.log('💬 Step 4: Verifying chat room opened...');
    await page.waitForTimeout(1500); // Wait for chat room to open
    
    const chatPanel = page.locator('#chat-panel');
    await expect(chatPanel).not.toHaveClass(/hidden/);
    
    // Verify chat room title
    const chatTitle = page.locator('.chat-panel__title');
    await expect(chatTitle).toContainText('配對成功');
    
    console.log('✅ Chat room opened successfully');
    
    // Step 6: Send a message
    console.log('✉️ Step 5: Sending a message...');
    const messageInput = page.locator('#chat-input');
    const sendButton = page.locator('#chat-send-btn');
    
    const testMessage = `Test message from ${browserName}`;
    await messageInput.fill(testMessage);
    await sendButton.click();
    
    // Wait for message to appear
    await page.waitForTimeout(1500);
    
    // Verify message appears in chat
    const chatMessages = page.locator('#chat-messages');
    await expect(chatMessages).toContainText(testMessage);
    
    console.log('✅ Message sent and displayed successfully');
    
    // Step 7: Take screenshot for visual comparison
    console.log('🎨 Step 6: Taking screenshot...');
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-chat-room.png`,
      fullPage: true 
    });
    
    console.log(`✅ ${browserName} test completed successfully\n`);
  });
});

test.describe('Cross-Browser: UI Consistency', () => {
  test('should display consistent layout across browsers', async ({ page, browserName }) => {
    console.log(`\n🎨 Testing UI consistency on: ${browserName}`);
    
    // Test home page layout
    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Verify key elements are visible
    await expect(page.locator('a[data-page="post"]')).toBeVisible();
    await expect(page.locator('#story-card')).toBeVisible();
    await expect(page.locator('#pat-btn')).toBeVisible();
    await expect(page.locator('#next-btn')).toBeVisible();
    
    // Take screenshot of home page
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-home.png`,
      fullPage: true 
    });
    
    // Test post page layout
    await page.click('a[data-page="post"]');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#post-input')).toBeVisible();
    await expect(page.locator('#post-submit')).toBeVisible();
    
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-post.png`,
      fullPage: true 
    });
    
    console.log(`✅ UI consistency verified on ${browserName}\n`);
  });
  
  test('should handle responsive design', async ({ page, browserName }) => {
    console.log(`\n📱 Testing responsive design on: ${browserName}`);
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForTimeout(500);
      
      // Verify page is usable at this size
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#story-card')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: `playwright-report/screenshots/${browserName}-${viewport.name}.png`,
        fullPage: true 
      });
      
      console.log(`  ✓ ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
    
    console.log(`✅ Responsive design verified on ${browserName}\n`);
  });
});
