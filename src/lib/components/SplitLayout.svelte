<script lang="ts">
	import type { Snippet } from 'svelte';
	import { viewMode } from '$lib/stores/view';

	let { editor, preview }: { editor: Snippet; preview: Snippet } = $props();

	// Panes are hidden, never destroyed — destroying them loses editor/preview
	// state (CodeMirror DOM, rendered canvases) when switching view modes.
	let container: HTMLDivElement | undefined = $state();
	let editorPct = $state(50);
	let dragging = $state(false);

	function clamp(pct: number): number {
		return Math.min(80, Math.max(20, pct));
	}

	function onPointerDown(event: PointerEvent) {
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging || !container) return;
		const rect = container.getBoundingClientRect();
		editorPct = clamp(((event.clientX - rect.left) / rect.width) * 100);
	}

	function onPointerUp() {
		dragging = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') editorPct = clamp(editorPct - 5);
		if (event.key === 'ArrowRight') editorPct = clamp(editorPct + 5);
	}
</script>

<div bind:this={container} class="flex h-full min-h-0 {dragging ? 'select-none' : ''}">
	<section
		aria-label="Editor"
		class="min-h-0 min-w-0 {$viewMode === 'preview' ? 'hidden' : ''}"
		style="width: {$viewMode === 'split' ? `${editorPct}%` : '100%'}"
	>
		{@render editor()}
	</section>
	<!-- ARIA "window splitter" pattern: a focusable separator IS interactive -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="separator"
		aria-orientation="vertical"
		aria-label="Resize panes"
		aria-valuenow={Math.round(editorPct)}
		aria-valuemin={20}
		aria-valuemax={80}
		tabindex="0"
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onkeydown={onKeydown}
		class="w-1 shrink-0 cursor-col-resize transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--c-accent)] {dragging
			? 'bg-[var(--c-accent)]'
			: 'bg-[var(--c-border)] hover:bg-[var(--c-accent)]'} {$viewMode === 'split' ? '' : 'hidden'}"
	></div>
	<section
		aria-label="Preview"
		class="min-h-0 min-w-0 flex-1 {$viewMode === 'editor' ? 'hidden' : ''}"
	>
		{@render preview()}
	</section>
</div>
