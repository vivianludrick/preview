// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import ActionRail from './ActionRail.svelte';

const children = createRawSnippet(() => ({
	render: () => '<button type="button">act</button>'
}));

function rail(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="toolbar"]') as HTMLElement;
}

async function pointerMove(x: number, y: number, buttons = 0) {
	window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, buttons }));
	await new Promise(requestAnimationFrame);
	flushSync();
}

beforeEach(() => {
	// jsdom rects are all zero — give the rail a real location (100,100)-(140,180)
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
		left: 100,
		top: 100,
		right: 140,
		bottom: 180,
		width: 40,
		height: 80,
		x: 100,
		y: 100,
		toJSON: () => ({})
	} as DOMRect);
});
afterEach(() => vi.restoreAllMocks());

describe('ActionRail', () => {
	it('stays invisible until the pointer comes near', async () => {
		const { container } = render(ActionRail, { props: { children } });
		expect(rail(container).className).toContain('opacity-0');

		await pointerMove(600, 600); // far away
		expect(rail(container).className).toContain('opacity-0');

		await pointerMove(150, 150); // within 150px of the rect
		expect(rail(container).className).toContain('opacity-100');
	});

	it('never materializes under the cursor mid-drag (text selection guard)', async () => {
		const { container } = render(ActionRail, { props: { children } });
		await pointerMove(150, 150, 1); // primary button held — ignored
		expect(rail(container).className).toContain('opacity-0');
	});

	it('hides while a drag that started outside is in progress', async () => {
		const { container } = render(ActionRail, { props: { children } });
		await pointerMove(150, 150);
		expect(rail(container).className).toContain('opacity-100');

		window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 300, clientY: 300 }));
		flushSync();
		expect(rail(container).className).toContain('opacity-0');

		window.dispatchEvent(new MouseEvent('pointerup', {}));
		flushSync();
		expect(rail(container).className).toContain('opacity-100');
	});

	it('forceVisible keeps it shown regardless of the pointer', () => {
		const { container } = render(ActionRail, { props: { children, forceVisible: true } });
		expect(rail(container).className).toContain('opacity-100');
	});

	it('renders its children inside the toolbar', () => {
		const { getByRole } = render(ActionRail, { props: { children, forceVisible: true } });
		expect(getByRole('button', { name: 'act' })).toBeInTheDocument();
	});
});
