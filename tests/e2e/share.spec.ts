import { test, expect } from '@playwright/test';

async function typeDocument(page: import('@playwright/test').Page, text: string) {
	const editor = page.locator('.cm-content');
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.type(text);
}

test('an unencrypted share link carries the document to a fresh browser', async ({
	page,
	context
}) => {
	await page.goto('/md/');
	await typeDocument(page, '# Shared Document');
	await page.getByRole('button', { name: 'Share' }).click();
	await page.getByRole('button', { name: /generate link/i }).click();
	const link = await page.getByLabel('Generated link').inputValue();
	expect(link).toContain('?data=');

	const receiver = await context.newPage();
	await receiver.goto(link);
	// receivers land in preview-only mode with the shared content
	await expect(receiver.getByRole('heading', { name: 'Shared Document' })).toBeVisible();
	await expect(receiver.getByRole('radio', { name: 'Preview' })).toHaveAttribute(
		'aria-checked',
		'true'
	);
});

test('a password-protected link decrypts only with the right password', async ({
	page,
	context
}) => {
	await page.goto('/md/');
	await typeDocument(page, '# Top Secret');
	await page.getByRole('button', { name: 'Share' }).click();
	await page.locator('#share-password').fill('hunter2');
	await page.getByRole('button', { name: /generate link/i }).click();
	const link = await page.getByLabel('Generated link').inputValue();

	const receiver = await context.newPage();
	await receiver.goto(link);
	const prompt = receiver.getByLabel('Password', { exact: true });
	await expect(prompt).toBeVisible();
	await prompt.fill('wrong-password');
	await receiver.getByRole('button', { name: /unlock/i }).click();
	await expect(receiver.getByText(/wrong password|try again/i).first()).toBeVisible();
	await prompt.fill('hunter2');
	await receiver.getByRole('button', { name: /unlock/i }).click();
	await expect(receiver.getByRole('heading', { name: 'Top Secret' })).toBeVisible();
});
