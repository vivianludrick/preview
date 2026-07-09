// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import PageSlider from './PageSlider.svelte';

const page = createRawSnippet<[number]>((i) => ({
	render: () => `<span data-testid="page-${i()}">page ${i()}</span>`
}));

function pagesIn(container: HTMLElement): number[] {
	return [...container.querySelectorAll('[data-testid^="page-"]')].map((el) =>
		Number(el.getAttribute('data-testid')!.replace('page-', ''))
	);
}

function layerFor(container: HTMLElement, i: number): HTMLElement {
	return container.querySelector(`[data-testid="page-${i}"]`)!.parentElement as HTMLElement;
}

describe('PageSlider', () => {
	it('prerenders the current page and its neighbours only', () => {
		const { container } = render(PageSlider, { props: { current: 2, count: 10, page } });
		expect(pagesIn(container)).toEqual([1, 2, 3]);
	});

	it('clamps the mounted window at the edges', async () => {
		const { container, rerender } = render(PageSlider, {
			props: { current: 0, count: 3, page }
		});
		expect(pagesIn(container)).toEqual([0, 1]);
		await rerender({ current: 2 });
		expect(pagesIn(container)).toEqual([1, 2]);
	});

	it('shows only the current page; neighbours are transparent and inert', () => {
		const { container } = render(PageSlider, { props: { current: 1, count: 3, page } });
		const currentLayer = layerFor(container, 1);
		const nextLayer = layerFor(container, 2);
		expect(currentLayer.style.opacity).toBe('1');
		expect(currentLayer.style.pointerEvents).toBe('auto');
		expect(nextLayer.style.opacity).toBe('0');
		expect(nextLayer.style.pointerEvents).toBe('none');
		// direction-aware offsets: previous sits left, next sits right
		expect(layerFor(container, 0).style.transform).toContain('-8%');
		expect(nextLayer.style.transform).toContain('8%');
	});

	it('keeps pages mounted across navigation so there is no flash', async () => {
		const { container, rerender } = render(PageSlider, {
			props: { current: 1, count: 5, page }
		});
		const before = container.querySelector('[data-testid="page-2"]');
		await rerender({ current: 2 });
		// the element that was prerendered as a neighbour is the SAME node now current
		expect(container.querySelector('[data-testid="page-2"]')).toBe(before);
		expect(layerFor(container, 2).style.opacity).toBe('1');
	});
});
