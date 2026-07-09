import { describe, it, expect, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
	it('collapses rapid calls into one trailing invocation', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const run = debounce(fn, 100);
		run();
		run();
		run();
		vi.advanceTimersByTime(99);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	it('passes through the latest arguments', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const run = debounce(fn, 50);
		run('first');
		run('second');
		vi.runAllTimers();
		expect(fn).toHaveBeenCalledWith('second');
		vi.useRealTimers();
	});

	it('cancel prevents the pending invocation', () => {
		vi.useFakeTimers();
		const fn = vi.fn();
		const run = debounce(fn, 50);
		run();
		run.cancel();
		vi.runAllTimers();
		expect(fn).not.toHaveBeenCalled();
		vi.useRealTimers();
	});
});
