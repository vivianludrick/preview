<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import PreviewLoading from '$lib/components/PreviewLoading.svelte';
	import PreviewChrome from '$lib/components/PreviewChrome.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import EditorChrome from '$lib/components/EditorChrome.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { receiveShared } from '$lib/share/receive';
	import { bytesToText } from '$lib/share/text';
	import { debounce } from '$lib/debounce';
	import { saveTextContent, loadTextContent } from '$lib/storage';
	import { defaultHomeDoc } from '$lib/previewers/home/sample';
	import type { EditorView } from '$lib/editor/base';

	// The homepage is itself a document in the HTML previewer: same split
	// layout and view modes, edits persist locally — but it always lands in
	// preview mode so it reads as a landing page first.
	const EXT = 'home';
	const DEFAULT_DOC = defaultHomeDoc(base);

	let content = $state(DEFAULT_DOC);
	let rendered = $state(DEFAULT_DOC);
	let previewReady = $state(false);
	let receiveError = $state('');
	let receiveCancelled = $state(false);
	let shareOpen = $state(false);

	let editorHost: HTMLDivElement | undefined = $state();
	let editorView: EditorView | null = $state(null);
	let editorReady = $state(false);

	const prompts = new PromptController();

	const scheduleRender = debounce(() => (rendered = content), 250);
	const schedulePersist = debounce(() => saveTextContent(EXT, content), 400);

	function onEdit(value: string) {
		content = value;
		scheduleRender();
		schedulePersist();
	}

	onMount(() => {
		viewMode.set('preview');
		shareHandler.set(() => (shareOpen = true));
		let destroyed = false;

		(async () => {
			const received = await receiveShared($page.url.searchParams.get('data'), prompts.prompt);
			if (destroyed) return;
			if (received.status === 'ok') content = bytesToText(received.bytes);
			else if (received.status === 'cancelled') receiveCancelled = true;
			else if (received.status === 'error') receiveError = received.message;
			else {
				const stored = loadTextContent(EXT);
				if (stored !== null && stored.trim()) content = stored;
			}
			rendered = content;
			previewReady = true;

			const ed = await import('$lib/previewers/html/editor');
			await tick();
			if (destroyed || !editorHost) return;
			editorView = ed.createEditor(editorHost, content, onEdit);
			editorReady = true;
		})();

		return () => {
			destroyed = true;
			scheduleRender.cancel();
			schedulePersist.cancel();
			shareHandler.set(null);
			editorView?.destroy();
		};
	});
</script>

<svelte:head>
	<title>preview — client-side file previewer</title>
	<meta
		name="description"
		content="Preview markdown, CSV, HTML, PDF, PPTX, DOCX and XLSX entirely in your browser. Share via self-contained, optionally encrypted links. No server, no uploads, no tracking."
	/>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<div class="relative h-full">
			<textarea
				class="h-full w-full resize-none bg-[var(--c-bg)] p-3 font-mono text-sm text-[var(--c-fg)] focus:outline-none {editorReady
					? 'hidden'
					: ''}"
				aria-label="Homepage HTML source"
				bind:value={content}
				oninput={() => {
					scheduleRender();
					schedulePersist();
				}}
			></textarea>
			<div bind:this={editorHost} class="h-full {editorReady ? '' : 'hidden'}"></div>
			<EditorChrome view={editorView} filename="home.html" />
		</div>
	{/snippet}
	{#snippet preview()}
		<div class="relative h-full">
			<PreviewLoading show={!previewReady && !receiveError && !receiveCancelled} />
			<PreviewChrome />
			{#if receiveError}
				<div class="p-6 text-sm text-red-500" role="alert">{receiveError}</div>
			{:else if receiveCancelled}
				<div class="p-6 text-sm text-[var(--c-muted)]">
					Password required to view this document. Reload the page to try again.
				</div>
			{:else}
				<!-- allow-top-navigation-by-user-activation: clicking a previewer
				     link inside the page navigates the app itself -->
				<iframe
					title="Homepage preview"
					sandbox="allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
					srcdoc={rendered}
					class="h-full w-full border-0 bg-[var(--c-bg)]"
				></iframe>
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
