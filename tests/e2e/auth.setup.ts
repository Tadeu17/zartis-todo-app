import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  const testUser = {
    name: 'E2E Test User',
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'E2eTestPass123!',
  };

  // Try to register or login
  await page.goto('/auth/signup');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if we're on signup page
  const isSignupPage = await page.getByRole('heading', { name: /create your account/i }).isVisible().catch(() => false);

  if (isSignupPage) {
    // Register new user
    await page.locator('input[placeholder="Your name"]').fill(testUser.name);
    await page.locator('input[placeholder="you@example.com"]').fill(testUser.email);
    await page.locator('input[placeholder="Create a password"]').fill(testUser.password);
    await page.locator('input[placeholder="Confirm your password"]').fill(testUser.password);

    await page.getByRole('button', { name: /sign up/i }).click();

    // Wait for redirect to home page
    await expect(page).toHaveURL('/', { timeout: 30000 });
  } else {
    // Already logged in or on login page
    const isLoginPage = await page.getByRole('heading', { name: /welcome back/i }).isVisible().catch(() => false);

    if (isLoginPage) {
      // Use a fixed test user for login
      await page.locator('input[placeholder="you@example.com"]').fill('e2e-test@example.com');
      await page.locator('input[placeholder="Enter your password"]').fill('E2eTestPass123!');
      await page.getByRole('button', { name: /log in/i }).click();

      // Wait for redirect
      await expect(page).toHaveURL('/', { timeout: 30000 });
    }
  }

  // Ensure we're authenticated
  await expect(page.getByRole('heading', { name: /my todo list/i })).toBeVisible({ timeout: 30000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
