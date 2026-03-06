import { test, expect } from '@playwright/test';

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show error when submitting empty title', async ({ page }) => {
    // Count existing todos before submission
    const todoItems = page.locator('[role="checkbox"]');
    const initialCount = await todoItems.count();

    // Attempt to submit form without filling title
    const submitButton = page.getByRole('button', { name: /add todo/i });
    await submitButton.click();

    // Verify error message appears
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Verify form is still visible (not submitted)
    await expect(page.getByLabel(/title/i)).toBeVisible();

    // Verify no new todo was created (count should remain the same)
    await page.waitForTimeout(1000); // Wait to ensure no submission occurred
    const finalCount = await todoItems.count();
    expect(finalCount).toBe(initialCount);
  });

  test('should show error when submitting whitespace-only title', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Count existing todos before submission
    const todoItems = page.locator('[role="checkbox"]');
    const initialCount = await todoItems.count();

    // Fill with spaces only
    await titleInput.fill('   ');
    await submitButton.click();

    // Verify error message appears (custom validation catches whitespace-only)
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Verify no new todo was created
    await page.waitForTimeout(1000);
    const finalCount = await todoItems.count();
    expect(finalCount).toBe(initialCount);
  });

  test('should handle very long title gracefully', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Create a very long title (500 characters)
    const longTitle = 'A'.repeat(500);
    await titleInput.fill(longTitle);

    // No validation error should appear for long titles
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).not.toBeVisible();

    // Submit should succeed
    await submitButton.click();

    // Wait for form to be submitted and reset (title field should be cleared)
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // Verify no errors appeared
    await expect(errorMessage).not.toBeVisible();
  });

  test('should clear error message when valid title is entered', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // First, trigger validation error
    await submitButton.click();
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Now fill in a valid title
    await titleInput.fill('Valid Todo Title');

    // Submit the form with valid data
    await submitButton.click();

    // Wait for form to be submitted and reset (title field should be cleared)
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // Error message should be gone
    await expect(errorMessage).not.toBeVisible();
  });

  test('should submit successfully after fixing validation error', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Step 1: Attempt to submit with empty title
    await submitButton.click();
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Step 2: Fill in valid title
    await titleInput.fill('Fixed Todo Item');

    // Step 3: Submit form
    await submitButton.click();

    // Step 4: Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // Step 5: Verify error is gone
    await expect(errorMessage).not.toBeVisible();
  });

  test('should not create duplicate todos on multiple error submissions', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });
    const todoItems = page.locator('[role="checkbox"]');
    const initialCount = await todoItems.count();

    // Submit empty form multiple times
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    // Verify only one error message appears
    const errorMessages = page.getByText(/title is required/i);
    await expect(errorMessages).toHaveCount(1);

    // Verify no todos were created after multiple failed submissions
    await page.waitForTimeout(1000);
    let currentCount = await todoItems.count();
    expect(currentCount).toBe(initialCount);

    // Now fill valid title and submit
    await titleInput.fill('Test Todo Unique');
    await submitButton.click();

    // Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });
  });

  test('should validate title but allow empty optional fields', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Fill only required title field (leave description, priority, dueDate as defaults)
    await titleInput.fill('Minimal Todo Validation');
    await submitButton.click();

    // Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // Verify no validation errors appeared
    const errorMessage = page.getByText(/is required/i);
    await expect(errorMessage).not.toBeVisible();
  });

  test('should maintain form state when validation fails', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const descriptionInput = page.getByLabel(/description/i);
    const prioritySelect = page.getByLabel(/priority/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Fill out all fields except title
    await descriptionInput.fill('This is a test description');
    await prioritySelect.selectOption('high');

    // Submit form (should fail due to empty title)
    await submitButton.click();

    // Verify error appears
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Verify other field values are maintained
    await expect(descriptionInput).toHaveValue('This is a test description');
    await expect(prioritySelect).toHaveValue('high');

    // Now fill title and submit
    await titleInput.fill('Complete Todo Maintained');
    await submitButton.click();

    // Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });
  });

  test('should clear form after successful submission', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const descriptionInput = page.getByLabel(/description/i);
    const prioritySelect = page.getByLabel(/priority/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Fill out complete form
    await titleInput.fill('Test Todo for Clearing Forms');
    await descriptionInput.fill('Test description');
    await prioritySelect.selectOption('low');

    // Submit form
    await submitButton.click();

    // Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // Verify form fields are cleared/reset
    await expect(descriptionInput).toHaveValue('');
    await expect(prioritySelect).toHaveValue('medium'); // Reset to default
  });

  test('should show validation on submit', async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    const descriptionInput = page.getByLabel(/description/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    // Focus on title, then blur without entering anything
    await titleInput.focus();
    await descriptionInput.focus(); // Blur title by focusing elsewhere

    // Note: react-hook-form by default validates on submit, not on blur
    // So we submit to trigger validation
    await submitButton.click();

    // Verify error appears
    const errorMessage = page.getByText(/title is required/i);
    await expect(errorMessage).toBeVisible();

    // Verify form did not submit
    await expect(submitButton).toBeEnabled();
  });
});
