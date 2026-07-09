<script lang="ts">
	import { onMount } from 'svelte';
	import { Eraser, Copy, Check, Download, Sparkles, LoaderCircle } from 'lucide-svelte';
	import { get } from 'svelte/store';
	import { geminiKey, geminiModel } from '$lib/stores/settings';
	import type { EditorView } from '$lib/editor/base';

	// One action rail overlaid on the editor's bottom-right corner. It stays
	// invisible until the cursor comes near (or while an AI call is running).
	let { view, filename = 'document.txt' }: { view: EditorView | null; filename?: string } =
		$props();

	let rail: HTMLElement | undefined = $state();
	let nearRail = $state(false);
	let draggingOutside = $state(false);
	let copied = $state(false);
	let aiBusy = $state(false);
	let aiError = $state('');

	const PROXIMITY_PX = 150;
	const visible = $derived((nearRail && !draggingOutside) || aiBusy);

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
			// a pressed button means a selection drag is in progress — never let
			// the rail appear under the cursor and swallow the drag
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

	/** the selection when there is one, otherwise the whole document */
	function selectedOrAll(): { text: string; from: number; to: number } {
		const doc = view!.state.doc;
		const sel = view!.state.selection.main;
		return sel.empty
			? { text: doc.toString(), from: 0, to: doc.length }
			: { text: view!.state.sliceDoc(sel.from, sel.to), from: sel.from, to: sel.to };
	}

	function clear() {
		if (!view) return;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } });
		view.focus();
	}

	async function copy() {
		if (!view) return;
		await navigator.clipboard.writeText(selectedOrAll().text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function download() {
		if (!view) return;
		const blob = new Blob([view.state.doc.toString()], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function runAi() {
		if (!view || aiBusy) return;
		const key = get(geminiKey);
		if (!key) return;
		const { text, from, to } = selectedOrAll();
		if (!text.trim()) return;
		aiBusy = true;
		aiError = '';
		try {
			const { generate } = await import('$lib/ai/gemini');
			const output = await generate(key, text, get(geminiModel));
			view.dispatch({
				changes: { from, to, insert: output },
				selection: { anchor: from, head: from + output.length }
			});
		} catch (e) {
			aiError = e instanceof Error ? e.message : 'AI request failed.';
			setTimeout(() => (aiError = ''), 5000);
		} finally {
			aiBusy = false;
		}
	}
</script>

{#if view}
	<div
		bind:this={rail}
		role="toolbar"
		aria-label="Editor actions"
		aria-orientation="vertical"
		class="absolute bottom-3 right-3 z-10 flex flex-col divide-y divide-[var(--c-border)] overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] text-xs text-[var(--c-muted)] shadow transition-opacity {visible
			? 'opacity-100'
			: 'pointer-events-none opacity-0'}"
	>
		<button
			type="button"
			title="Clear editor"
			onclick={clear}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-red-500"
		>
			<Eraser size={13} aria-hidden="true" /> clear
		</button>
		<button
			type="button"
			title="Copy the document (or selection)"
			onclick={copy}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-[var(--c-fg)]"
		>
			{#if copied}<Check size={13} aria-hidden="true" /> copied{:else}<Copy
					size={13}
					aria-hidden="true"
				/> copy{/if}
		</button>
		<button
			type="button"
			title="Download as {filename}"
			onclick={download}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-[var(--c-fg)]"
		>
			<Download size={13} aria-hidden="true" /> download
		</button>
		{#if $geminiKey}
			<button
				type="button"
				title="Send the document (or selection) to Gemini and replace it with the response"
				onclick={runAi}
				disabled={aiBusy}
				class="flex items-center gap-2 px-3 py-2 text-[var(--c-accent)] hover:bg-[var(--c-bg)]"
			>
				{#if aiBusy}
					<LoaderCircle size={13} class="animate-spin" aria-hidden="true" /> thinking…
				{:else}
					<Sparkles size={13} aria-hidden="true" /> ai
				{/if}
			</button>
		{/if}
	</div>
	{#if aiError}
		<p
			role="alert"
			class="absolute bottom-3 right-32 z-10 max-w-xs rounded-lg border border-red-500/50 bg-[var(--c-surface)] px-3 py-2 text-xs text-red-500 shadow"
		>
			{aiError}
		</p>
	{/if}
{/if}
