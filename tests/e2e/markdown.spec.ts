import { test, expect } from '@playwright/test';

test('renders the sample document live', async ({ page }) => {
	await page.goto('/md/');
	await expect(page.getByRole('heading', { name: /welcome to preview\.md/i })).toBeVisible();
});

test('typing re-renders the preview and persists across reloads', async ({ page }) => {
	await page.goto('/md/');
	const editor = page.locator('.cm-content');
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type('# Fresh Title');
	await expect(page.getByRole('heading', { name: 'Fresh Title' })).toBeVisible();
	await page.waitForTimeout(600); // persist debounce
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Fresh Title' })).toBeVisible();
});

test('view modes switch without losing editor content', async ({ page }) => {
	await page.goto('/md/');
	const editor = page.locator('.cm-content');
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type('survives mode switches');
	await page.getByRole('radio', { name: 'Preview' }).click();
	await expect(editor).toBeHidden();
	await page.getByRole('radio', { name: 'Split' }).click();
	await expect(editor).toContainText('survives mode switches');
});

test('the editor action rail copies, downloads and clears', async ({ page }) => {
	await page.goto('/md/');
	await page.locator('.cm-content').click();
	// the rail fades in when the pointer approaches the editor's top right
	const rail = page.locator('section[aria-label="Editor"] [role="toolbar"]');
	await rail.hover({ force: true });
	await expect(rail).toBeVisible();

	const download = page.waitForEvent('download');
	await rail.getByTitle(/download/i).click();
	expect((await download).suggestedFilename()).toBe('document.md');

	await rail.getByTitle('Clear editor').click();
	await expect(page.locator('.cm-content')).toHaveText('');
});

test('full screen presents the preview pane alone', async ({ page }) => {
	await page.goto('/md/');
	const previewRail = page.locator('section[aria-label="Preview"] [role="toolbar"]');
	await previewRail.hover({ force: true });
	await previewRail.getByTitle(/present the preview/i).click();
	const fullscreened = await page.evaluate(
		() => document.fullscreenElement?.getAttribute('class') ?? null
	);
	expect(fullscreened).not.toBeNull();
	await previewRail.getByTitle(/exit full screen/i).click();
	expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});
