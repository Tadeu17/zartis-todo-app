import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    await expect(page.getByRole('heading', { name: /my todo list/i })).toBeVisible();

    // Check for form section
    await expect(page.getByRole('heading', { name: /add new todo/i })).toBeVisible();

    // Check for todos section
    await expect(page.getByRole('heading', { name: /your todos/i })).toBeVisible();
  });

  test('should display form fields', async ({ page }) => {
    await page.goto('/');

    // Check all form fields are present
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/priority/i)).toBeVisible();
    await expect(page.getByLabel(/due date/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /add todo/i })).toBeVisible();
  });
});
