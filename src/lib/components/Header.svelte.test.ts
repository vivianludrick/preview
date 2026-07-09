// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { get, type Writable } from 'svelte/store';
import { page } from '$app/stores';
import Header from './Header.svelte';

type PageValue = { route: { id: string }; url: URL; params: object; data: object };
const pageStore = page as unknown as Writable<PageValue>;

function setRoute(id: string) {
	pageStore.set({ ...get(pageStore), route: { id } });
}

describe('Header', () => {
	it('shows the previewer dropdown (with no marker) on previewer pages', () => {
		setRoute('/md');
		const { container } = render(Header);
		const select = screen.getByLabelText('Switch previewer') as HTMLSelectElement;
		expect(select.value).toBe('md');
		expect([...select.options].map((o) => o.value)).toContain('xlsx');
		// the ▾ marker was removed by request
		expect(container.textContent).not.toContain('▾');
	});

	it('treats the homepage as a previewer: view toggle + share, no dropdown', () => {
		setRoute('/');
		render(Header);
		expect(screen.queryByLabelText('Switch previewer')).toBeNull();
		expect(screen.getByRole('radiogroup', { name: /view mode/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
	});

	it('links to the GitHub repository', () => {
		setRoute('/md');
		render(Header);
		const link = screen.getByRole('link', { name: /github repository/i });
		expect(link).toHaveAttribute('href', 'https://github.com/vivianludrick/preview');
		expect(link).toHaveAttribute('target', '_blank');
	});

	it('always offers the settings gear', () => {
		setRoute('/pdf');
		render(Header);
		expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
	});
});
