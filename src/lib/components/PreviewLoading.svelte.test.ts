// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PreviewLoading from './PreviewLoading.svelte';

describe('PreviewLoading', () => {
	it('renders nothing when not loading', () => {
		const { container } = render(PreviewLoading, { props: { show: false } });
		expect(container.querySelector('[role="status"]')).toBeNull();
	});

	it('overlays a live-region loading screen with the given label', () => {
		render(PreviewLoading, { props: { show: true, label: 'Parsing workbook…' } });
		const status = screen.getByRole('status');
		expect(status).toHaveTextContent('Parsing workbook…');
		// an overlay on TOP of the content, not a replacement for it
		expect(status.className).toContain('absolute');
		expect(status.className).toContain('inset-0');
	});

	it('defaults to a generic rendering label', () => {
		render(PreviewLoading, { props: { show: true } });
		expect(screen.getByRole('status')).toHaveTextContent('Rendering…');
	});
});
