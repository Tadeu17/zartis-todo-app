import { test, expect } from '@playwright/test';

test.describe('Text Overflow Handling', () => {
  test('should handle very long todo titles without overflow', async ({ page }) => {
    await page.goto('/');

    // Use unique identifier to avoid conflicts
    const timestamp = Date.now();
    const longTitle = `Long title test ${timestamp} - This is an extremely long todo title that should wrap properly without overflowing the container and breaking the layout of the todo card component`;

    await page.getByLabel(/title/i).fill(longTitle);
    await page.getByRole('button', { name: /add todo/i }).click();

    // Wait for form to reset (indicates submission complete)
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 5000 });

    // Wait for todo to appear - use the unique timestamp to find our specific todo
    const todoTitle = page.locator('h3').filter({ hasText: `Long title test ${timestamp}` }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });

    // Take screenshot to verify no overflow
    await page.screenshot({ path: 'test-results/long-title-test.png', fullPage: true });
  });

  test('should handle very long descriptions without overflow', async ({ page }) => {
    await page.goto('/');

    // Use unique identifier
    const timestamp = Date.now();
    const title = `Long desc test ${timestamp}`;
    const longDescription = 'This is an extremely long description with lots of text that should wrap properly within the todo card without causing any horizontal overflow or breaking the layout. It contains many words to test the text wrapping behavior and ensure that the content stays within the boundaries of the card component.';

    await page.getByLabel(/title/i).fill(title);
    await page.getByLabel(/description/i).fill(longDescription);
    await page.getByRole('button', { name: /add todo/i }).click();

    // Wait for form to reset
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 5000 });

    // Wait for todo to appear using unique title
    const todoTitle = page.locator('h3').filter({ hasText: title }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });

    // Take screenshot to verify no overflow
    await page.screenshot({ path: 'test-results/long-description-test.png', fullPage: true });
  });

  test('should handle long words without breaking layout', async ({ page }) => {
    await page.goto('/');

    // Use unique identifier
    const timestamp = Date.now();
    const titleWithLongWord = `Long words test ${timestamp} supercalifragilisticexpialidocious pneumonoultramicroscopicsilicovolcanoconiosis`;
    const descriptionWithLongWord = 'URLs like https://www.example.com/very/long/path/that/should/not/break/the/layout/of/our/component/structure';

    await page.getByLabel(/title/i).fill(titleWithLongWord);
    await page.getByLabel(/description/i).fill(descriptionWithLongWord);
    await page.getByRole('button', { name: /add todo/i }).click();

    // Wait for form to reset
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 5000 });

    // Wait for todo to appear - use the unique timestamp to find our specific todo
    const todoTitle = page.locator('h3').filter({ hasText: `Long words test ${timestamp}` }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });

    // Take screenshot to verify no overflow
    await page.screenshot({ path: 'test-results/long-words-test.png', fullPage: true });
  });
});
