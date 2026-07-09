<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	// Vertical action rail overlaid on a pane's top-right corner (the pane
	// needs `relative`). Invisible until the cursor comes near, and never
	// materializes under the cursor mid-drag, where it would swallow a text
	// selection in progress.
	let {
		children,
		forceVisible = false
	}: { children: Snippet; forceVisible?: boolean } = $props();

	let rail: HTMLElement | undefined = $state();
	let nearRail = $state(false);
	let draggingOutside = $state(false);

	const PROXIMITY_PX = 150;
	const visible = $derived((nearRail && !draggingOutside) || forceVisible);

	function near(el: HTMLElement | undefined, x: number, y: number): boolean {
		if (!el) return false;
		const rect = el.getBoundingClientRect();
		const cx = Math.max(rect.left, Math.min(x, rect.right));
		const cy = Math.max(rect.top, Math.min(y, rect.bottom));
		return Math.hypot(x - cx, y - cy) < PROXIMITY_PX;
	}

	onMount(() => {
		let raf = 0;
		const onMove = (event: PointerEvent) => {
			if (event.buttons !== 0) return;
			const { clientX, clientY } = event;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => (nearRail = near(rail, clientX, clientY)));
		};
		const onDown = (event: PointerEvent) => {
			draggingOutside = !(event.target instanceof Node && rail?.contains(event.target));
		};
		const onUp = () => (draggingOutside = false);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerdown', onDown);
		window.addEventListener('pointerup', onUp);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointerup', onUp);
		};
	});
</script>

<div
	bind:this={rail}
	role="toolbar"
	aria-label="Pane actions"
	aria-orientation="vertical"
	class="absolute right-3 top-3 z-10 flex flex-col divide-y divide-[var(--c-border)] overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] text-xs text-[var(--c-muted)] shadow transition-opacity {visible
		? 'opacity-100'
		: 'pointer-events-none opacity-0'}"
>
	{@render children()}
</div>
