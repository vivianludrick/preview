import { test, expect } from '@playwright/test';

const frame = (page: import('@playwright/test').Page) =>
	page.frameLocator('iframe[title="Homepage preview"]');

test('opens in preview-only mode showing the rendered homepage document', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('radio', { name: 'Preview' })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(frame(page).getByRole('heading', { name: /preview\*/ })).toBeVisible();
	// the previewer list is hidden until something is searched
	await expect(frame(page).locator('#cards')).toBeHidden();
});

test('search filters previewers and Enter opens the match', async ({ page }) => {
	await page.goto('/');
	const q = frame(page).locator('#q');
	await q.click();
	await q.fill('excel');
	await expect(frame(page).locator('.card.active')).toContainText('Excel');
	await q.press('Enter');
	await expect(page).toHaveURL(/\/xlsx\/?$/);
});

test('scattered extension links navigate the app', async ({ page }) => {
	await page.goto('/');
	await frame(page).locator('a.scatter', { hasText: '.md' }).click();
	await expect(page).toHaveURL(/\/md\/?$/);
});

test('the homepage document is editable and edits persist', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('radio', { name: 'Split' }).click();
	const editor = page.locator('.cm-content');
	await expect(editor).toBeVisible();
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type('<h1 id="custom">MY HOMEPAGE</h1>');
	await expect(frame(page).locator('#custom')).toHaveText('MY HOMEPAGE');
	// persisted: reload lands in preview mode with the edited document
	await page.waitForTimeout(600); // persist debounce
	await page.reload();
	await expect(page.getByRole('radio', { name: 'Preview' })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(frame(page).locator('#custom')).toHaveText('MY HOMEPAGE');
});
