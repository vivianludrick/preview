/**
 * Trailing-edge debounce with a `cancel` handle, used for the editor
 * re-render and localStorage persist timers on every text previewer.
 */
export interface Debounced<A extends unknown[]> {
	(...args: A): void;
	cancel(): void;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const run = (...args: A) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
	run.cancel = () => clearTimeout(timer);
	return run;
}
