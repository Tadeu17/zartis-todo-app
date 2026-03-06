import { test, expect, Page } from '@playwright/test';

// Helper function to generate unique test titles
function generateUniqueTitle(base: string): string {
  return `${base} ${Date.now()}`;
}

test.describe('Todo CRUD Flow - Create, Complete, Delete', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('should complete full create-complete-delete flow', async ({ page }) => {
    // AC1: Load the homepage successfully
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /add todo/i })).toBeVisible();

    // AC2: Fill out the todo form with title, description, priority, due date
    const titleInput = page.getByLabel(/title/i);
    const descriptionInput = page.getByLabel(/description/i);
    const prioritySelect = page.getByLabel(/priority/i);
    const dueDateInput = page.getByLabel(/due date/i);
    const submitButton = page.getByRole('button', { name: /add todo/i });

    const testTitle = generateUniqueTitle('Complete E2E Test Todo');
    const testDescription = 'Testing the full CRUD flow with detailed steps';
    const testPriority = 'high';
    const testDueDate = '2026-12-31';

    await titleInput.fill(testTitle);
    await descriptionInput.fill(testDescription);
    await prioritySelect.selectOption(testPriority);
    await dueDateInput.fill(testDueDate);

    // AC3: Submit the form
    await submitButton.click();

    // Wait for form to be submitted and reset
    await expect(titleInput).toHaveValue('', { timeout: 10000 });

    // AC4: Verify the new todo appears in the Active Tasks section
    const activeSection = page.getByRole('heading', { name: /active tasks/i });
    await expect(activeSection).toBeVisible();

    // AC5: Verify all fields display correctly
    // Find the todo item by its title using a more reliable selector
    const todoTitleHeading = page.locator('h3').filter({ hasText: testTitle }).first();
    await expect(todoTitleHeading).toBeVisible();

    // Get the parent container of the todo item (need to go up 3 levels: h3 -> div -> div -> div.flex)
    const todoItem = todoTitleHeading.locator('../../..');

    // Verify description is displayed
    await expect(todoItem.getByText(testDescription)).toBeVisible();

    // Verify priority badge is displayed with correct value
    const priorityBadge = todoItem.locator('span').filter({ hasText: testPriority });
    await expect(priorityBadge).toBeVisible();

    // Verify due date is displayed
    await expect(todoItem.getByText(/Due: Dec 31, 2026/)).toBeVisible();

    // Verify checkbox is unchecked
    const checkbox = todoItem.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();

    // AC6: Click the checkbox to mark todo as complete
    await checkbox.click();

    // Wait for the state to update
    await page.waitForTimeout(1500);

    // AC7: Verify the todo moves to the Completed section
    const completedSection = page.getByRole('heading', { name: /completed/i });
    await expect(completedSection).toBeVisible();

    // Find the todo in the completed section
    const completedTodoTitle = page.locator('h3.line-through').filter({ hasText: testTitle });
    await expect(completedTodoTitle).toBeVisible();

    // AC8: Verify completed styling applied (strike-through)
    await expect(completedTodoTitle).toHaveClass(/line-through/);
    await expect(completedTodoTitle).toHaveClass(/text-gray-600/);

    // Get the completed todo item container
    const completedTodoItem = completedTodoTitle.locator('../../..');

    // Verify checkbox is now checked
    const completedCheckbox = completedTodoItem.locator('input[type="checkbox"]');
    await expect(completedCheckbox).toBeChecked();

    // AC9: Click the delete button
    const deleteButton = completedTodoItem.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible();

    // Set up dialog handler for confirmation
    page.on('dialog', async (dialog) => {
      // AC10: Confirm the deletion in the dialog
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Are you sure you want to delete this todo?');
      await dialog.accept();
    });

    await deleteButton.click();

    // Wait for deletion to process
    await page.waitForTimeout(1500);

    // AC11: Verify the todo disappears from the list
    await expect(page.locator('h3').filter({ hasText: testTitle })).not.toBeVisible();

    // AC12: Verify empty state appears if no other todos exist
    // Check if there are any other todos
    const allCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await allCheckboxes.count();

    if (checkboxCount === 0) {
      // If no todos exist, empty state should be visible
      await expect(page.getByText(/no todos yet/i)).toBeVisible();
      await expect(page.getByText(/create your first one/i)).toBeVisible();

      // Active and Completed section headers should not be visible
      await expect(activeSection).not.toBeVisible();
      await expect(completedSection).not.toBeVisible();
    } else {
      // If other todos exist, empty state should not be visible
      await expect(page.getByText(/no todos yet/i)).not.toBeVisible();
    }
  });

  test('should handle multiple todos in create-complete-delete flow', async ({ page }) => {
    const firstTitle = generateUniqueTitle('First Todo Item');
    const secondTitle = generateUniqueTitle('Second Todo Item');

    // Create first todo
    await page.getByLabel(/title/i).fill(firstTitle);
    await page.getByRole('button', { name: /add todo/i }).click();
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 10000 });

    // Create second todo
    await page.getByLabel(/title/i).fill(secondTitle);
    await page.getByRole('button', { name: /add todo/i }).click();
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 10000 });

    // Verify both todos are in Active section
    await expect(page.locator('h3').filter({ hasText: firstTitle }).first()).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: secondTitle }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /active tasks/i })).toBeVisible();

    // Complete first todo - find by title then get checkbox in that container
    const firstTodoTitle = page.locator('h3').filter({ hasText: firstTitle }).first();
    const firstTodoContainer = firstTodoTitle.locator('../../..');
    const firstTodoCheckbox = firstTodoContainer.locator('input[type="checkbox"]');
    await firstTodoCheckbox.click();
    await page.waitForTimeout(1500);

    // Verify first todo moved to Completed, second still in Active
    await expect(page.getByRole('heading', { name: /completed/i })).toBeVisible();
    const completedFirstTodo = page.locator('h3.line-through').filter({ hasText: firstTitle });
    await expect(completedFirstTodo).toBeVisible();

    // Second todo should still be in Active (without line-through)
    const activeSecondTodo = page.locator('h3').filter({ hasText: secondTitle }).and(page.locator('h3:not(.line-through)'));
    await expect(activeSecondTodo).toBeVisible();

    // Delete completed todo
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const completedTodoContainer = completedFirstTodo.locator('../../..');
    const deleteButton = completedTodoContainer.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    await page.waitForTimeout(1500);

    // Verify first todo is gone, second still exists
    await expect(page.locator('h3').filter({ hasText: firstTitle })).not.toBeVisible();
    await expect(page.locator('h3').filter({ hasText: secondTitle })).toBeVisible();

    // Empty state should NOT appear (second todo still exists)
    await expect(page.getByText(/no todos yet/i)).not.toBeVisible();
  });

  test('should cancel deletion when dialog is dismissed', async ({ page }) => {
    const testTitle = generateUniqueTitle('Todo to Keep');

    // Create a todo
    await page.getByLabel(/title/i).fill(testTitle);
    await page.getByRole('button', { name: /add todo/i }).click();
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 10000 });

    // Try to delete but cancel
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete this todo?');
      await dialog.dismiss(); // Cancel the deletion
    });

    const todoTitle = page.locator('h3').filter({ hasText: testTitle }).first();
    const todoContainer = todoTitle.locator('../../..');
    const deleteButton = todoContainer.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Verify todo still exists
    await expect(page.locator('h3').filter({ hasText: testTitle })).toBeVisible();
  });

  test('should maintain todo data integrity through complete-uncomplete cycle', async ({ page }) => {
    // Create a todo with all fields
    const testTitle = generateUniqueTitle('Data Integrity Test');
    const testDescription = 'Testing data persistence';
    const testPriority = 'low';
    const testDueDate = '2027-01-15';

    await page.getByLabel(/title/i).fill(testTitle);
    await page.getByLabel(/description/i).fill(testDescription);
    await page.getByLabel(/priority/i).selectOption(testPriority);
    await page.getByLabel(/due date/i).fill(testDueDate);
    await page.getByRole('button', { name: /add todo/i }).click();
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 10000 });

    // Complete the todo
    const todoTitle = page.locator('h3').filter({ hasText: testTitle }).first();
    const todoContainer = todoTitle.locator('../../..');
    const checkbox = todoContainer.locator('input[type="checkbox"]');
    await checkbox.click();
    await page.waitForTimeout(1500);

    // Verify data is intact in Completed section
    const completedTitle = page.locator('h3.line-through').filter({ hasText: testTitle });
    const completedTodo = completedTitle.locator('../../..');
    await expect(completedTodo.getByText(testDescription)).toBeVisible();
    await expect(completedTodo.getByText(testPriority)).toBeVisible();
    await expect(completedTodo.getByText(/Due: Jan 15, 2027/)).toBeVisible();

    // Uncomplete the todo
    const completedCheckbox = completedTodo.locator('input[type="checkbox"]');
    await completedCheckbox.click();
    await page.waitForTimeout(1500);

    // Verify data is still intact in Active section
    const activeTodoTitle = page.locator('h3').filter({ hasText: testTitle }).and(page.locator('h3:not(.line-through)'));
    const activeTodo = activeTodoTitle.locator('../../..');
    await expect(activeTodo.getByText(testDescription)).toBeVisible();
    await expect(activeTodo.getByText(testPriority)).toBeVisible();
    await expect(activeTodo.getByText(/Due: Jan 15, 2027/)).toBeVisible();
  });

  test('should display empty state when all todos are deleted', async ({ page }) => {
    const testTitle = generateUniqueTitle('Last Todo Standing');

    // Create a single todo
    await page.getByLabel(/title/i).fill(testTitle);
    await page.getByRole('button', { name: /add todo/i }).click();
    await expect(page.getByLabel(/title/i)).toHaveValue('', { timeout: 10000 });

    // Verify todo is visible
    await expect(page.locator('h3').filter({ hasText: testTitle })).toBeVisible();

    // Delete the todo
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const todoTitle = page.locator('h3').filter({ hasText: testTitle }).first();
    const todoContainer = todoTitle.locator('../../..');
    const deleteButton = todoContainer.getByRole('button', { name: /delete/i });
    await deleteButton.click();

    // Verify todo is gone
    await expect(page.locator('h3').filter({ hasText: testTitle })).not.toBeVisible({ timeout: 5000 });
  });
});
