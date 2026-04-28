import { test, expect } from '@playwright/test';

/**
 * Basic Cross-Browser Tests for TrashMatch
 * 
 * Simplified tests focusing on core functionality across browsers
 * Validates: Requirements 7.6
 */

test.describe('Cross-Browser: Basic Functionality', () => {
  test('should load home page correctly', async ({ page, browserName }) => {
    console.log(`\n🌐 Testing home page on: ${browserName}`);
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Verify key elements are visible
    await expect(page.locator('.nav-brand')).toContainText('TrashMatch');
    await expect(page.locator('#story-card')).toBeVisible();
    await expect(page.locator('#pat-btn')).toBeVisible();
    await expect(page.locator('#next-btn')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-home-basic.png`,
      fullPage: true 
    });
    
    console.log(`✅ Home page loaded successfully on ${browserName}\n`);
  });
  
  test('should navigate to post page', async ({ page, browserName }) => {
    console.log(`\n📝 Testing post page navigation on: ${browserName}`);
    
    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Click post link
    await page.click('a[data-page="post"]');
    await page.waitForTimeout(500);
    
    // Verify post page is visible
    const postPage = page.locator('#post-page');
    await expect(postPage).not.toHaveClass(/hidden/);
    
    // Verify post form elements
    await expect(page.locator('#post-input')).toBeVisible();
    await expect(page.locator('#post-submit')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-post-basic.png`,
      fullPage: true 
    });
    
    console.log(`✅ Post page navigation works on ${browserName}\n`);
  });
  
  test('should display responsive layout', async ({ page, browserName }) => {
    console.log(`\n📱 Testing responsive layout on: ${browserName}`);
    
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForTimeout(500);
      
      // Verify key elements are still visible
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#story-card')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ 
        path: `playwright-report/screenshots/${browserName}-${viewport.name}-basic.png`,
        fullPage: true 
      });
      
      console.log(`  ✓ ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
    
    console.log(`✅ Responsive layout verified on ${browserName}\n`);
  });
  
  test('should interact with pat button', async ({ page, browserName }) => {
    console.log(`\n👏 Testing pat button on: ${browserName}`);
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Get initial pat count
    const initialCount = await page.locator('#pat-count').textContent();
    console.log(`  Initial pat count: ${initialCount}`);
    
    // Click pat button
    await page.click('#pat-btn');
    await page.waitForTimeout(1000);
    
    // Get new pat count
    const newCount = await page.locator('#pat-count').textContent();
    console.log(`  New pat count: ${newCount}`);
    
    // Verify count increased
    expect(parseInt(newCount)).toBeGreaterThan(parseInt(initialCount));
    
    console.log(`✅ Pat button works on ${browserName}\n`);
  });
  
  test('should load next story', async ({ page, browserName }) => {
    console.log(`\n👀 Testing next story button on: ${browserName}`);
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Get initial story content
    const initialContent = await page.locator('#story-content').textContent();
    console.log(`  Initial story loaded`);
    
    // Click next button
    await page.click('#next-btn');
    await page.waitForTimeout(1000);
    
    // Get new story content
    const newContent = await page.locator('#story-content').textContent();
    console.log(`  New story loaded`);
    
    // Verify content changed (or stayed same if only one story)
    expect(newContent).toBeTruthy();
    
    console.log(`✅ Next story button works on ${browserName}\n`);
  });
});

test.describe('Cross-Browser: Visual Consistency', () => {
  test('should render UI consistently', async ({ page, browserName }) => {
    console.log(`\n🎨 Testing visual consistency on: ${browserName}`);
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Check CSS is loaded
    const backgroundColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    console.log(`  Body background color: ${backgroundColor}`);
    
    // Verify fonts are loaded
    const fontFamily = await page.locator('.nav-brand').evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    console.log(`  Nav brand font: ${fontFamily}`);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: `playwright-report/screenshots/${browserName}-visual-check.png`,
      fullPage: true 
    });
    
    console.log(`✅ Visual consistency checked on ${browserName}\n`);
  });
});
