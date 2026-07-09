// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InfoTip from './InfoTip.svelte';

describe('InfoTip', () => {
	it('keeps the description hidden until toggled', async () => {
		render(InfoTip, { props: { text: 'Handy explanation.' } });
		const tooltip = screen.getByRole('tooltip', { hidden: true });
		expect(tooltip.className).toContain('hidden');

		await userEvent.click(screen.getByRole('button', { name: /more info/i }));
		expect(screen.getByRole('tooltip').className).not.toContain('hidden');

		await userEvent.click(screen.getByRole('button', { name: /more info/i }));
		expect(screen.getByRole('tooltip', { hidden: true }).className).toContain('hidden');
	});

	it('exposes expanded state for assistive tech', async () => {
		render(InfoTip, { props: { text: 'x' } });
		const button = screen.getByRole('button', { name: /more info/i });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		await userEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
	});
});
