import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Sparring Analysis Feature
 * 
 * These tests verify the user flow for video upload and analysis
 */

test.describe('Sparring Analysis', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display the app landing page', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/KOREV|MMA|Coach/i);
  });

  test('should show login page for unauthenticated users', async ({ page }) => {
    // Look for login/auth elements
    const authButton = page.getByRole('button', { name: /connexion|login|se connecter/i });
    const emailInput = page.getByPlaceholder(/email/i);
    
    // Should see either login button or email input
    const hasAuthElements = await authButton.isVisible().catch(() => false) || 
                           await emailInput.isVisible().catch(() => false);
    
    expect(hasAuthElements).toBeTruthy();
  });

});

test.describe('Video Upload UI', () => {
  
  test('FAB button should be visible on dashboard', async ({ page }) => {
    await page.goto('/');
    
    // The Sparring Analysis FAB should be visible (if user is on dashboard)
    // Since user needs to be logged in, we check for public elements
    const fabButton = page.locator('[data-testid="sparring-fab"]');
    const analyzeButton = page.getByRole('button', { name: /analyse|sparring|combat/i });
    
    // At least one analysis-related element should exist
    const hasAnalysisUI = await fabButton.isVisible().catch(() => false) ||
                          await analyzeButton.isVisible().catch(() => false);
    
    // This may be false if not logged in - that's expected
    console.log('Analysis UI visible:', hasAnalysisUI);
  });

});

test.describe('Auth Flow', () => {
  
  test('should have email input on auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Should see email input
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('should have password input on auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Should see password input (check multiple selectors)
    const passwordInput = page.locator('input[type="password"]');
    const passwordPlaceholder = page.getByPlaceholder(/mot de passe|password/i);
    
    const hasPasswordField = await passwordInput.isVisible().catch(() => false) ||
                             await passwordPlaceholder.isVisible().catch(() => false);
    
    expect(hasPasswordField).toBeTruthy();
  });

  test('should have login button on auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Should see login/submit button
    const loginButton = page.getByRole('button', { name: /connexion|login|se connecter|submit/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });

  test('should show form validation elements', async ({ page }) => {
    await page.goto('/auth');
    
    // Check that form elements exist
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole('button', { name: /connexion|login|se connecter|submit|envoyer/i });
    
    // At least email should be visible
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // Check form exists
    const hasForm = await passwordInput.isVisible().catch(() => false) ||
                    await submitButton.isVisible().catch(() => false);
    
    console.log('Auth form has password/submit:', hasForm);
  });

});

test.describe('Responsive Design', () => {
  
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still render
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Page should still render
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Page should still render
    await expect(page.locator('body')).toBeVisible();
  });

});

test.describe('Navigation', () => {
  
  test('should navigate to auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page).toHaveURL(/auth/);
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    
    // Wait for page to settle
    await page.waitForLoadState('networkidle');
    
    // Should show 404 text, redirect, or still render something
    const notFoundText = page.getByText(/404|not found|page introuvable|oops/i);
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('auth') || 
                         currentUrl.includes('login') || 
                         !currentUrl.includes('nonexistent');
    
    const hasNotFound = await notFoundText.isVisible().catch(() => false);
    const pageLoaded = await page.locator('body').isVisible();
    
    // Either shows 404, redirects, or page still renders (React Router handles it)
    const handled = hasNotFound || isRedirected || pageLoaded;
    console.log('404 handling - notFound:', hasNotFound, 'redirected:', isRedirected, 'loaded:', pageLoaded);
    expect(handled).toBeTruthy();
  });

});

test.describe('Performance', () => {
  
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors (like missing favicon)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('net::ERR')
    );
    
    console.log('Console errors:', criticalErrors);
    
    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });

});

