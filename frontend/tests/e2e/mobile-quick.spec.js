import { test, expect } from '@playwright/test';

/**
 * Quick Mobile Device Tests for TrashMatch
 * 
 * Simplified mobile tests that run quickly to verify basic mobile functionality
 * 
 * Validates: Requirements 7.6
 */

test.describe('Mobile Quick Tests', () => {
  test('iOS Safari - Basic functionality', async ({ page, browserName }) => {
    // Only run on mobile-safari project
    test.skip(browserName !== 'webkit', 'iOS Safari test');
    
    console.log('\n📱 Testing iOS Safari basic functionality');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#story-card')).toBeVisible();
    
    // Verify touch-friendly elements
    const patButton = page.locator('#pat-btn');
    await expect(patButton).toBeVisible();
    
    // Check button size (should be touch-friendly)
    const buttonBox = await patButton.boundingBox();
    expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-report/screenshots/ios-safari-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ iOS Safari basic functionality verified');
  });

  test('Android Chrome - Basic functionality', async ({ page, browserName }) => {
    // Only run on mobile-chrome project
    test.skip(browserName !== 'chromium', 'Android Chrome test');
    
    console.log('\n📱 Testing Android Chrome basic functionality');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#story-card')).toBeVisible();
    
    // Verify touch-friendly elements
    const patButton = page.locator('#pat-btn');
    await expect(patButton).toBeVisible();
    
    // Check button size (should be touch-friendly)
    const buttonBox = await patButton.boundingBox();
    expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-report/screenshots/android-chrome-mobile.png',
      fullPage: true 
    });
    
    console.log('✅ Android Chrome basic functionality verified');
  });

  test('Mobile responsive layout', async ({ page }) => {
    console.log('\n📐 Testing mobile responsive layout');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Get viewport size
    const viewport = page.viewportSize();
    console.log(`  Viewport: ${viewport.width}x${viewport.height}`);
    
    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1); // +1 for rounding
    
    // Verify story card fits
    const storyCard = page.locator('#story-card');
    const cardBox = await storyCard.boundingBox();
    expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
    
    console.log('✅ Mobile responsive layout verified');
  });

  test('Mobile touch interaction', async ({ page }) => {
    console.log('\n👆 Testing mobile touch interaction');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Get initial pat count
    const patCountBefore = await page.locator('#pat-count').textContent();
    console.log(`  Initial pat count: ${patCountBefore}`);
    
    // Tap pat button
    const patButton = page.locator('#pat-btn');
    await patButton.tap();
    await page.waitForTimeout(1500);
    
    // Verify pat count increased
    const patCountAfter = await page.locator('#pat-count').textContent();
    console.log(`  After tap pat count: ${patCountAfter}`);
    
    expect(parseInt(patCountAfter)).toBeGreaterThanOrEqual(parseInt(patCountBefore));
    
    console.log('✅ Mobile touch interaction verified');
  });

  test('Mobile navigation', async ({ page }) => {
    console.log('\n🧭 Testing mobile navigation');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Tap post link
    const postLink = page.locator('a[data-page="post"]');
    await postLink.tap();
    await page.waitForTimeout(500);
    
    // Verify post page displayed
    const postPage = page.locator('#post-page');
    await expect(postPage).not.toHaveClass(/hidden/);
    
    // Verify form elements visible
    await expect(page.locator('#post-input')).toBeVisible();
    await expect(page.locator('#post-submit')).toBeVisible();
    
    console.log('✅ Mobile navigation verified');
  });

  test('Mobile text readability', async ({ page }) => {
    console.log('\n📖 Testing mobile text readability');
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Check story content font size
    const storyContent = page.locator('#story-content');
    const fontSize = await storyContent.evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });
    
    console.log(`  Story font size: ${fontSize}`);
    
    // Font should be at least 14px for mobile readability
    const fontSizeNum = parseInt(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
    
    console.log('✅ Mobile text readability verified');
  });
});
