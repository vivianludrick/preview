import { test, expect } from '@playwright/test';
import path from 'node:path';

const fixture = (name: string) => path.join(import.meta.dirname, 'fixtures', name);

test('csv renders the sample as a table with delimiter detection', async ({ page }) => {
	await page.goto('/csv/');
	await expect(page.locator('table th').first()).toBeVisible();
	await expect(page.getByText(/delimiter/)).toBeVisible();
});

test('html renders into a sandboxed live frame', async ({ page }) => {
	await page.goto('/html/');
	const iframe = page.locator('section[aria-label="Preview"] iframe');
	await expect(iframe).toHaveAttribute('sandbox', /allow-scripts/);
});

test('xlsx upload shows sheet tabs and cell data, and persists', async ({ page }) => {
	await page.goto('/xlsx/');
	await page.locator('input[type="file"]').setInputFiles(fixture('book.xlsx'));
	await expect(page.getByRole('tab', { name: 'Revenue' })).toBeVisible();
	await expect(page.getByRole('cell', { name: 'EMEA' })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('cell', { name: 'APAC' })).toBeVisible();
});

test('pdf upload renders pages; fullscreen presents one page at a time', async ({ page }) => {
	await page.goto('/pdf/');
	await page.locator('input[type="file"]').setInputFiles(fixture('three.pdf'));
	await expect(page.getByText('3 pages')).toBeVisible();

	const previewRail = page.locator('section[aria-label="Preview"] [role="toolbar"]');
	await previewRail.hover({ force: true });
	await previewRail.getByTitle(/present the preview/i).click();
	await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
	await previewRail.getByTitle(/exit full screen/i).click();
	await expect(page.getByText('3 pages')).toBeVisible();
});

test('ppt upload shows slides + filmstrip; fullscreen hides the filmstrip', async ({ page }) => {
	await page.goto('/ppt/');
	await page.locator('input[type="file"]').setInputFiles(fixture('deck.pptx'));
	await expect(page.getByText('Slide 1 / 3')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Go to slide 2' })).toBeVisible();

	const previewRail = page.locator('section[aria-label="Preview"] [role="toolbar"]');
	await previewRail.hover({ force: true });
	await previewRail.getByTitle(/present the preview/i).click();
	await expect(page.getByText('Slide 1 / 3')).toBeHidden();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByText('Second slide').first()).toBeVisible();
	await previewRail.getByTitle(/exit full screen/i).click();
	await expect(page.getByText('Slide 2 / 3')).toBeVisible();
});

test('the upload rail clears the loaded document and its stored copy', async ({ page }) => {
	await page.goto('/xlsx/');
	await page.locator('input[type="file"]').setInputFiles(fixture('book.xlsx'));
	await expect(page.getByRole('tab', { name: 'Revenue' })).toBeVisible();
	const uploadRail = page.locator('section[aria-label="Editor"] [role="toolbar"]');
	await uploadRail.hover({ force: true });
	await uploadRail.getByTitle(/clear the loaded document/i).click();
	await expect(page.getByText('Choose an XLSX to preview')).toBeVisible();
	expect(
		await page.evaluate(() => localStorage.getItem('preview:content:xlsx'))
	).toBeNull();
});

test('header dropdown switches previewers and github link is present', async ({ page }) => {
	await page.goto('/md/');
	await page.getByLabel('Switch previewer').selectOption('csv');
	await expect(page).toHaveURL(/\/csv\/?$/);
	await expect(page.getByRole('link', { name: /github repository/i })).toHaveAttribute(
		'href',
		'https://github.com/vivianludrick/preview'
	);
});
