import { test, expect } from '@playwright/test';

test('saving a Gemini key stores it and reveals the AI action', async ({ page }) => {
	await page.goto('/md/');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Gemini API key').fill('test-key-123');
	await page.getByRole('button', { name: 'Save' }).click();
	expect(await page.evaluate(() => localStorage.getItem('preview:gemini-key'))).toBe(
		'test-key-123'
	);
	await page.getByRole('button', { name: 'Close settings' }).click();

	const rail = page.locator('section[aria-label="Editor"] [role="toolbar"]');
	await rail.hover({ force: true });
	await expect(rail.getByTitle(/gemini/i)).toBeVisible();
});

test('the key can be removed again from the dialog', async ({ page }) => {
	await page.goto('/md/');
	await page.evaluate(() => localStorage.setItem('preview:gemini-key', 'old-key'));
	await page.reload();
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByLabel('Gemini API key')).toHaveValue('old-key');
	await page.getByRole('button', { name: 'Remove API key' }).click();
	expect(await page.evaluate(() => localStorage.getItem('preview:gemini-key'))).toBeNull();
});

test('model selection persists', async ({ page }) => {
	await page.goto('/md/');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Gemini model').selectOption('gemini-2.5-pro');
	expect(await page.evaluate(() => localStorage.getItem('preview:gemini-model'))).toBe(
		'gemini-2.5-pro'
	);
});

test('clicking the backdrop closes the dialog', async ({ page }) => {
	await page.goto('/md/');
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	// click well outside the dialog box
	await page.mouse.click(10, 400);
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden();
});

test('theme picker switches the palette', async ({ page }) => {
	await page.goto('/md/');
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Theme').selectOption('dracula');
	await expect
		.poll(() =>
			page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()
			)
		)
		.toBe('#282a36');
	expect(await page.evaluate(() => localStorage.getItem('preview:theme'))).toBe('dracula');
});

test('clear cached data wipes saved documents but keeps settings', async ({ page }) => {
	await page.goto('/md/');
	await page.evaluate(() => {
		localStorage.setItem('preview:content:md', JSON.stringify({ kind: 'text', text: 'x' }));
		localStorage.setItem('preview:gemini-key', 'keepme');
	});
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByRole('button', { name: /clear cached data/i }).click();
	expect(await page.evaluate(() => localStorage.getItem('preview:content:md'))).toBeNull();
	expect(await page.evaluate(() => localStorage.getItem('preview:gemini-key'))).toBe('keepme');
});
