<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { LoaderCircle } from 'lucide-svelte';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { SAMPLE_DOCUMENT } from '$lib/previewers/markdown/sample';
	import type { EditorView } from '@codemirror/view';

	let content = $state(SAMPLE_DOCUMENT);
	let rendered = $state('');
	let rendererReady = $state(false);
	let receiveError = $state('');
	let receiveCancelled = $state(false);
	let shareOpen = $state(false);

	let renderMarkdown: ((s: string) => string) | null = null;
	let editorHost: HTMLDivElement | undefined = $state();
	let editorView: EditorView | null = null;
	let editorReady = $state(false);

	const prompts = new PromptController();

	// re-render per keystroke, debounced so multi-thousand-line docs stay smooth
	let renderTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleRender() {
		clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			if (renderMarkdown) rendered = renderMarkdown(content);
		}, 120);
	}

	onMount(() => {
		viewMode.set('split');
		shareHandler.set(() => (shareOpen = true));
		let destroyed = false;

		(async () => {
			// receiver path: content arrives inside the URL, default to Preview mode
			const data = $page.url.searchParams.get('data');
			if (data) {
				viewMode.set('preview');
				try {
					const codec = await import('$lib/share/codec');
					const bytes = await codec.decodeShareInteractive(data, prompts.prompt);
					if (destroyed) return;
					if (bytes === null) {
						receiveCancelled = true;
					} else {
						content = codec.bytesToText(bytes);
					}
				} catch (e) {
					receiveError = e instanceof Error ? e.message : 'Could not open this share link.';
				}
			}

			// page shell is already interactive; previewer + editor load in the background
			const render = await import('$lib/previewers/markdown/render');
			if (destroyed) return;
			renderMarkdown = render.renderMarkdown;
			rendered = renderMarkdown(content);
			rendererReady = true;

			const ed = await import('$lib/previewers/markdown/editor');
			await tick(); // make sure the editor host is in the DOM
			if (destroyed || !editorHost) return;
			editorView = ed.createEditor(editorHost, content, (value) => {
				content = value;
				scheduleRender();
			});
			editorReady = true;
		})();

		return () => {
			destroyed = true;
			clearTimeout(renderTimer);
			shareHandler.set(null);
			editorView?.destroy();
		};
	});
</script>

<svelte:head>
	<title>preview.md — markdown previewer</title>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<div class="relative h-full">
			<!-- plain textarea keeps typing possible while CodeMirror loads in the background -->
			<textarea
				class="h-full w-full resize-none bg-[var(--c-bg)] p-3 font-mono text-sm text-[var(--c-fg)] focus:outline-none {editorReady
					? 'hidden'
					: ''}"
				aria-label="Markdown source"
				bind:value={content}
				oninput={scheduleRender}
			></textarea>
			<div bind:this={editorHost} class="h-full {editorReady ? '' : 'hidden'}"></div>
		</div>
	{/snippet}
	{#snippet preview()}
		<div class="h-full overflow-y-auto">
			{#if receiveError}
				<div class="p-6 text-sm text-red-500" role="alert">{receiveError}</div>
			{:else if receiveCancelled}
				<div class="p-6 text-sm text-[var(--c-muted)]">
					Password required to view this document. Reload the page to try again.
				</div>
			{:else if !rendererReady}
				<div class="flex h-full items-center justify-center gap-2 text-[var(--c-muted)]">
					<LoaderCircle size={18} class="animate-spin" aria-hidden="true" />
					<span class="text-sm">Loading preview…</span>
				</div>
			{:else}
				<article class="md-preview mx-auto max-w-3xl px-6 py-6">
					<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitized by DOMPurify in render.ts -->
					{@html rendered}
				</article>
			{/if}
		</div>
	{/snippet}
</SplitLayout>

<ShareDialog bind:open={shareOpen} getPayload={() => content} />
<PasswordPrompt
	bind:open={prompts.open}
	error={prompts.error}
	attemptsLeft={prompts.attemptsLeft}
	onsubmit={prompts.submit}
	oncancel={prompts.cancel}
/>
