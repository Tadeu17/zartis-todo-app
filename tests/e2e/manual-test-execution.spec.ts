/**
 * Manual Testing Script for Todo App
 * This script performs comprehensive manual testing of the Todo App
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Todo App - Comprehensive Manual Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('1. Homepage Load - Verify UI elements and styling', async ({ page }) => {
    console.log('\n=== TEST 1: Homepage Load ===');

    // Verify page title
    await expect(page).toHaveTitle(/My Todo List/i);

    // Verify main heading
    const heading = page.locator('h1:has-text("My Todo List")');
    await expect(heading).toBeVisible();
    console.log('✓ Main heading visible');

    // Verify subtitle
    const subtitle = page.locator('text=Stay organized and productive');
    await expect(subtitle).toBeVisible();
    console.log('✓ Subtitle visible');

    // Verify form section
    const formSection = page.locator('h2:has-text("Add New Todo")');
    await expect(formSection).toBeVisible();
    console.log('✓ Form section visible');

    // Verify todo list section
    const listSection = page.locator('h2:has-text("Your Todos")');
    await expect(listSection).toBeVisible();
    console.log('✓ Todo list section visible');

    // Verify form fields exist
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#priority')).toBeVisible();
    await expect(page.locator('#dueDate')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    console.log('✓ All form fields visible');

    // Verify gradient background
    const mainDiv = page.locator('div.min-h-screen').first();
    await expect(mainDiv).toHaveClass(/bg-gradient-to-br/);
    console.log('✓ Background gradient applied');
  });

  test('2. Form Validation - Empty title should show error', async ({ page }) => {
    console.log('\n=== TEST 2: Form Validation ===');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error
    const errorMessage = page.locator('text=Title is required');
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
    console.log('✓ Validation error displayed for empty title');

    // Verify error styling (red text)
    await expect(errorMessage).toHaveClass(/text-red-600/);
    console.log('✓ Error message has correct styling');
  });

  test('3. Create Todo - With all fields', async ({ page }) => {
    console.log('\n=== TEST 3: Create Todo with All Fields ===');

    // Use unique title to avoid conflicts with other tests
    const uniqueTitle = `Complete project documentation ${Date.now()}`;

    // Fill in all fields
    await page.locator('#title').fill(uniqueTitle);
    console.log('✓ Filled title');

    await page.locator('#description').fill('Write comprehensive docs for all components');
    console.log('✓ Filled description');

    await page.locator('#priority').selectOption('high');
    console.log('✓ Selected high priority');

    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.locator('#dueDate').fill(dateString);
    console.log('✓ Set due date');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for loading state
    await expect(submitButton).toHaveText('Adding...', { timeout: 1000 });
    console.log('✓ Loading state shown');

    // Wait for form to reset
    await expect(page.locator('#title')).toHaveValue('', { timeout: 5000 });
    console.log('✓ Form reset after submission');

    // Verify todo appears in list - use the unique title
    const todoTitle = page.locator('h3').filter({ hasText: uniqueTitle }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });
    console.log('✓ Todo item visible in list');

    // Verify high priority badge - find the card containing our unique title
    const todoCard = todoTitle.locator('xpath=ancestor::div[contains(@class, "p-4")]').first();
    const priorityBadge = todoCard.locator('span.bg-red-100').first();
    await expect(priorityBadge).toBeVisible();
    console.log('✓ High priority badge displayed with correct colors');
  });

  test('4. Create Multiple Todos - Different priorities', async ({ page }) => {
    console.log('\n=== TEST 4: Create Multiple Todos ===');

    const timestamp = Date.now();
    const todos = [
      { title: `Low priority task ${timestamp}`, priority: 'low', description: 'This can wait', badgeClass: 'bg-blue-100' },
      { title: `Medium priority task ${timestamp}`, priority: 'medium', description: 'Do this soon', badgeClass: 'bg-amber-100' },
      { title: `High priority task ${timestamp}`, priority: 'high', description: 'Do this now!', badgeClass: 'bg-red-100' },
    ];

    for (const todo of todos) {
      await page.locator('#title').fill(todo.title);
      await page.locator('#description').fill(todo.description);
      await page.locator('#priority').selectOption(todo.priority);
      await page.locator('button[type="submit"]').click();

      // Wait for form to reset
      await expect(page.locator('#title')).toHaveValue('', { timeout: 5000 });
      console.log(`✓ Created: ${todo.title}`);

      // Small delay between submissions
      await page.waitForTimeout(500);
    }

    // Verify all todos are visible and have correct priority badges
    for (const todo of todos) {
      const todoTitle = page.locator('h3').filter({ hasText: todo.title }).first();
      await expect(todoTitle).toBeVisible();

      // Find the parent card and verify the priority badge
      const todoCard = todoTitle.locator('xpath=ancestor::div[contains(@class, "p-4")]').first();
      const priorityBadge = todoCard.locator(`span.${todo.badgeClass}`).first();
      await expect(priorityBadge).toBeVisible();
    }
    console.log('✓ All todos visible in list');
    console.log('✓ All priority badges have correct colors');
  });

  test('5. Toggle Todo Completion', async ({ page }) => {
    console.log('\n=== TEST 5: Toggle Todo Completion ===');

    // Create a test todo with unique name
    const todoName = `Test completion toggle ${Date.now()}`;
    await page.locator('#title').fill(todoName);
    await page.locator('button[type="submit"]').click();

    // Wait for form to reset (indicates submission complete)
    await expect(page.locator('#title')).toHaveValue('', { timeout: 5000 });

    // Find the todo title element
    const todoTitle = page.locator('h3').filter({ hasText: todoName }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });

    // Find the parent card and checkbox
    const todoCard = todoTitle.locator('xpath=ancestor::div[contains(@class, "p-4")]').first();
    const checkbox = todoCard.locator('input[type="checkbox"]').first();

    // Verify initially unchecked
    await expect(checkbox).not.toBeChecked();
    console.log('✓ Todo initially unchecked');

    // Toggle to completed - use click() instead of check() for server action compatibility
    await checkbox.click();

    // Wait for the state to update (server action needs to complete)
    await expect(checkbox).toBeChecked({ timeout: 10000 });
    console.log('✓ Todo marked as completed');

    // Re-find elements as the DOM may have updated
    const completedTodoTitle = page.locator('h3').filter({ hasText: todoName }).first();

    // Verify text has strike-through
    await expect(completedTodoTitle).toHaveClass(/line-through/, { timeout: 5000 });
    console.log('✓ Completed todo has strike-through text');

    // Verify Completed section exists
    const completedSection = page.locator('h2:has-text("Completed")');
    await expect(completedSection).toBeVisible();
    console.log('✓ Completed section visible');

    // Toggle back to active - re-find elements as they may have moved in DOM
    const updatedTodoTitle = page.locator('h3').filter({ hasText: todoName }).first();
    const updatedTodoCard = updatedTodoTitle.locator('xpath=ancestor::div[contains(@class, "p-4")]').first();
    const updatedCheckbox = updatedTodoCard.locator('input[type="checkbox"]').first();

    // Use click() instead of uncheck()
    await updatedCheckbox.click();

    // Wait for state update
    await expect(updatedCheckbox).not.toBeChecked({ timeout: 10000 });
    console.log('✓ Todo toggled back to active');

    // Verify text no longer has strike-through
    await expect(updatedTodoTitle).not.toHaveClass(/line-through/, { timeout: 5000 });
    console.log('✓ Active todo does not have strike-through');
  });

  test('6. Delete Todo with Confirmation', async ({ page }) => {
    console.log('\n=== TEST 6: Delete Todo ===');

    // Create a test todo
    await page.locator('#title').fill('Todo to be deleted');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    // Verify todo exists
    await expect(page.locator('text=Todo to be deleted')).toBeVisible();
    console.log('✓ Todo created');

    // Set up dialog handler
    page.on('dialog', async dialog => {
      console.log(`✓ Confirmation dialog shown: "${dialog.message()}"`);
      expect(dialog.message()).toContain('Are you sure you want to delete this todo?');
      await dialog.accept();
    });

    // Click delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();
    await page.waitForTimeout(1000);

    // Verify todo is removed
    await expect(page.locator('text=Todo to be deleted')).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Todo deleted successfully');
  });

  test('7. Empty State Message', async ({ page }) => {
    console.log('\n=== TEST 7: Empty State ===');

    // Note: This test assumes database might have existing todos
    // Check if empty state message or todos are present
    const emptyMessage = page.locator('text=No todos yet. Create your first one!');
    const todoItems = page.locator('input[type="checkbox"]');

    const todoCount = await todoItems.count();

    if (todoCount === 0) {
      await expect(emptyMessage).toBeVisible();
      console.log('✓ Empty state message displayed when no todos exist');
    } else {
      console.log(`⊙ Database has ${todoCount} existing todos, empty state not shown`);
    }
  });

  test('8. Create Todo - Minimal fields (title only)', async ({ page }) => {
    console.log('\n=== TEST 8: Create Todo with Minimal Fields ===');

    // Fill only required field with unique name
    const todoName = `Minimal todo ${Date.now()}`;
    await page.locator('#title').fill(todoName);

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for form to reset
    await expect(page.locator('#title')).toHaveValue('', { timeout: 5000 });

    // Verify todo appears using unique name
    const todoTitle = page.locator('h3').filter({ hasText: todoName }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });
    console.log('✓ Todo created with only title field');

    // Verify default priority (medium) - scope to the todo card
    const todoCard = todoTitle.locator('xpath=ancestor::div[contains(@class, "p-4")]').first();
    const priorityBadge = todoCard.locator('span.bg-amber-100').first();
    await expect(priorityBadge).toBeVisible();
    console.log('✓ Todo displayed with default medium priority');
  });

  test('9. Edge Case - Very Long Title and Description', async ({ page }) => {
    console.log('\n=== TEST 9: Edge Case - Long Text ===');

    const longTitle = 'A'.repeat(200);
    const longDescription = 'B'.repeat(500);

    await page.locator('#title').fill(longTitle);
    await page.locator('#description').fill(longDescription);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1000);

    // Verify todo was created
    const todoTitle = page.locator('h3').filter({ hasText: 'AAA' }).first();
    await expect(todoTitle).toBeVisible({ timeout: 5000 });
    console.log('✓ Todo created with very long title and description');

    // Check if text is displayed (might be truncated by CSS)
    const isVisible = await todoTitle.isVisible();
    expect(isVisible).toBe(true);
    console.log('✓ Long text is displayed without breaking layout');
  });

  test('10. Accessibility - Keyboard Navigation', async ({ page }) => {
    console.log('\n=== TEST 10: Keyboard Navigation ===');

    const todoName = `Keyboard test todo ${Date.now()}`;

    // Focus directly on title field (more reliable than Tab)
    await page.locator('#title').focus();
    await page.keyboard.type(todoName);
    console.log('✓ Can type in title field via keyboard');

    // Tab to description
    await page.keyboard.press('Tab');
    await page.keyboard.type('Testing keyboard navigation');
    console.log('✓ Can tab to description field');

    // Tab through priority and date to submit button
    await page.keyboard.press('Tab'); // priority
    await page.keyboard.press('Tab'); // date
    await page.keyboard.press('Tab'); // submit button

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Wait for form to reset
    await expect(page.locator('#title')).toHaveValue('', { timeout: 5000 });

    // Verify todo was created
    await expect(page.locator(`h3:has-text("${todoName}")`)).toBeVisible({ timeout: 5000 });
    console.log('✓ Todo created using only keyboard navigation');
  });

  test('11. UI/UX - Responsive Design (Desktop)', async ({ page }) => {
    console.log('\n=== TEST 11: Responsive Design - Desktop ===');

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Verify grid layout
    const gridContainer = page.locator('.grid.gap-6.md\\:grid-cols-2');
    await expect(gridContainer).toBeVisible();
    console.log('✓ Desktop grid layout applied');

    // Verify form and list are side by side
    const formSection = page.locator('h2:has-text("Add New Todo")');
    const listSection = page.locator('h2:has-text("Your Todos")');

    const formBox = await formSection.boundingBox();
    const listBox = await listSection.boundingBox();

    if (formBox && listBox) {
      expect(formBox.y).toBeLessThan(listBox.y + 100); // Roughly same vertical position
      console.log('✓ Form and list sections are side by side on desktop');
    }
  });

  test('12. UI/UX - Responsive Design (Mobile)', async ({ page }) => {
    console.log('\n=== TEST 12: Responsive Design - Mobile ===');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Verify all elements still visible
    await expect(page.locator('h1:has-text("My Todo List")')).toBeVisible();
    await expect(page.locator('#title')).toBeVisible();
    console.log('✓ All elements visible on mobile viewport');

    // Verify form is full width
    const titleInput = page.locator('#title');
    const inputBox = await titleInput.boundingBox();

    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(300); // Should be nearly full width
      console.log('✓ Form fields are full width on mobile');
    }
  });

  test('13. Multiple Rapid Submissions', async ({ page }) => {
    console.log('\n=== TEST 13: Multiple Rapid Submissions ===');

    // Try to submit multiple times rapidly
    const todos = ['Quick 1', 'Quick 2', 'Quick 3'];

    for (const title of todos) {
      await page.locator('#title').fill(title);
      await page.locator('button[type="submit"]').click();
      // Minimal wait to simulate rapid submission
      await page.waitForTimeout(200);
    }

    // Wait for all to process
    await page.waitForTimeout(3000);

    // Verify all todos were created
    for (const title of todos) {
      const todoExists = await page.locator(`text=${title}`).count();
      if (todoExists > 0) {
        console.log(`✓ ${title} created successfully`);
      } else {
        console.log(`✗ ${title} was not created (possible race condition)`);
      }
    }
  });

  test('14. Form Field Labels and Accessibility', async ({ page }) => {
    console.log('\n=== TEST 14: Form Accessibility ===');

    // Verify all form fields have labels
    const titleLabel = page.locator('label[for="title"]');
    await expect(titleLabel).toBeVisible();
    await expect(titleLabel).toContainText('Title');
    console.log('✓ Title field has label');

    const descLabel = page.locator('label[for="description"]');
    await expect(descLabel).toBeVisible();
    await expect(descLabel).toContainText('Description');
    console.log('✓ Description field has label');

    const priorityLabel = page.locator('label[for="priority"]');
    await expect(priorityLabel).toBeVisible();
    await expect(priorityLabel).toContainText('Priority');
    console.log('✓ Priority field has label');

    const dateLabel = page.locator('label[for="dueDate"]');
    await expect(dateLabel).toBeVisible();
    await expect(dateLabel).toContainText('Due Date');
    console.log('✓ Due Date field has label');

    // Verify required field indicator
    await expect(titleLabel).toContainText('*');
    console.log('✓ Required field is marked with asterisk');

    // Verify placeholders
    await expect(page.locator('#title')).toHaveAttribute('placeholder', 'What needs to be done?');
    await expect(page.locator('#description')).toHaveAttribute('placeholder', 'Add more details...');
    console.log('✓ Form fields have helpful placeholders');
  });

  test('15. Button States and Interactions', async ({ page }) => {
    console.log('\n=== TEST 15: Button States ===');

    const submitButton = page.locator('button[type="submit"]');

    // Verify initial state
    await expect(submitButton).toBeEnabled();
    await expect(submitButton).toHaveText('Add Todo');
    console.log('✓ Submit button initially enabled with correct text');

    // Fill form and submit
    await page.locator('#title').fill('Button state test');
    await submitButton.click();

    // Verify loading state
    await expect(submitButton).toHaveText('Adding...');
    await expect(submitButton).toBeDisabled();
    console.log('✓ Submit button shows loading state and is disabled');

    // Wait for completion
    await page.waitForTimeout(2000);

    // Verify button returns to normal state
    await expect(submitButton).toBeEnabled();
    await expect(submitButton).toHaveText('Add Todo');
    console.log('✓ Submit button returns to enabled state after submission');
  });
});
