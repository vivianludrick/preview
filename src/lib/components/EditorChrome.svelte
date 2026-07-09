<script lang="ts">
	import { onMount } from 'svelte';
	import { Eraser, Sparkles, LoaderCircle } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { geminiKey } from '$lib/stores/settings';
	import type { EditorView } from '$lib/editor/base';

	// Floating actions overlaid on an editor pane. Both buttons stay invisible
	// until the cursor comes near them (or while the AI call is running).
	let { view }: { view: EditorView | null } = $props();

	let clearButton: HTMLElement | undefined = $state();
	let aiButton: HTMLElement | undefined = $state();
	let nearClear = $state(false);
	let nearAi = $state(false);
	let aiBusy = $state(false);
	let aiError = $state('');

	const PROXIMITY_PX = 130;

	function near(el: HTMLElement | undefined, x: number, y: number): boolean {
		if (!el) return false;
		const rect = el.getBoundingClientRect();
		const cx = Math.max(rect.left, Math.min(x, rect.right));
		const cy = Math.max(rect.top, Math.min(y, rect.bottom));
		return Math.hypot(x - cx, y - cy) < PROXIMITY_PX;
	}

	onMount(() => {
		const onMove = (event: PointerEvent) => {
			nearClear = near(clearButton, event.clientX, event.clientY);
			nearAi = near(aiButton, event.clientX, event.clientY);
		};
		window.addEventListener('pointermove', onMove);
		return () => window.removeEventListener('pointermove', onMove);
	});

	function clear() {
		if (!view) return;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } });
		view.focus();
	}

	async function runAi() {
		if (!view || aiBusy) return;
		const key = get(geminiKey);
		if (!key) return;
		const selection = view.state.selection.main;
		const wholeDoc = selection.empty;
		const text = wholeDoc
			? view.state.doc.toString()
			: view.state.sliceDoc(selection.from, selection.to);
		if (!text.trim()) return;
		aiBusy = true;
		aiError = '';
		try {
			const { generate } = await import('$lib/ai/gemini');
			const output = await generate(key, text);
			if (wholeDoc) {
				view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: output } });
			} else {
				view.dispatch({
					changes: { from: selection.from, to: selection.to, insert: output },
					selection: { anchor: selection.from, head: selection.from + output.length }
				});
			}
		} catch (e) {
			aiError = e instanceof Error ? e.message : 'AI request failed.';
			setTimeout(() => (aiError = ''), 5000);
		} finally {
			aiBusy = false;
		}
	}
</script>

{#if view}
	<button
		bind:this={clearButton}
		type="button"
		aria-label="Clear editor"
		title="Clear editor"
		onclick={clear}
		class="absolute right-3 top-3 z-10 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1.5 text-[var(--c-muted)] shadow transition-opacity hover:text-red-500 {nearClear
			? 'opacity-100'
			: 'pointer-events-none opacity-0'}"
	>
		<Eraser size={15} aria-hidden="true" />
	</button>

	{#if $geminiKey}
		<button
			bind:this={aiButton}
			type="button"
			aria-label="Rewrite with AI"
			title="Send the document (or selection) to Gemini and replace it with the response"
			onclick={runAi}
			disabled={aiBusy}
			class="absolute bottom-3 right-3 z-10 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-2 text-[var(--c-accent)] shadow transition-opacity hover:border-[var(--c-accent)] {nearAi ||
			aiBusy
				? 'opacity-100'
				: 'pointer-events-none opacity-0'}"
		>
			{#if aiBusy}
				<LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
			{:else}
				<Sparkles size={16} aria-hidden="true" />
			{/if}
		</button>
		{#if aiError}
			<p
				role="alert"
				class="absolute bottom-14 right-3 z-10 max-w-xs rounded-lg border border-red-500/50 bg-[var(--c-surface)] px-3 py-2 text-xs text-red-500 shadow"
			>
				{aiError}
			</p>
		{/if}
	{/if}
{/if}
