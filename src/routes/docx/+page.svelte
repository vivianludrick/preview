<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import PreviewLoading from '$lib/components/PreviewLoading.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { saveFileContent, loadFileContent } from '$lib/storage';

	const EXT = 'docx';

	let fileBytes: Uint8Array | null = null;
	let fileName = $state('');
	let rendered = $state('');
	let hasDocument = $state(false);
	let loading = $state(false);
	let error = $state('');
	let shareOpen = $state(false);
	let destroyed = false;

	const prompts = new PromptController();

	async function loadBytes(bytes: Uint8Array, name: string) {
		loading = true;
		error = '';
		try {
			const mod = await import('$lib/previewers/docx');
			if (destroyed) return;
			rendered = await mod.renderDocx(bytes);
			if (destroyed) return;
			fileBytes = bytes;
			fileName = name;
			hasDocument = true;
		} catch {
			error = 'Could not open this file as a DOCX document.';
		} finally {
			loading = false;
		}
	}

	async function onUpload(file: File) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		await loadBytes(bytes, file.name);
		if (!error) saveFileContent(EXT, file.name, bytes);
	}

	onMount(() => {
		viewMode.set('split');
		shareHandler.set(() => (shareOpen = true));

		(async () => {
			const data = $page.url.searchParams.get('data');
			if (!data) {
				const stored = loadFileContent(EXT);
				if (stored) await loadBytes(stored.bytes, stored.name);
				return;
			}
			viewMode.set('preview');
			loading = true;
			try {
				const codec = await import('$lib/share/codec');
				const bytes = await codec.decodeShareInteractive(data, prompts.prompt);
				if (destroyed) return;
				if (bytes === null) {
					loading = false;
					error = 'Password required to view this document. Reload the page to try again.';
					return;
				}
				await loadBytes(bytes, 'shared.docx');
			} catch (e) {
				loading = false;
				error = e instanceof Error ? e.message : 'Could not open this share link.';
			}
		})();

		return () => {
			destroyed = true;
			shareHandler.set(null);
		};
	});
</script>

<svelte:head>
	<title>preview.docx — Word previewer</title>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<UploadPanel
			accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			label="Choose a DOCX to preview"
			hint="converted locally, never uploaded"
			{fileName}
			onfile={onUpload}
		/>
	{/snippet}
	{#snippet preview()}
		<div class="relative h-full">
			<PreviewLoading show={loading} label="Converting document…" />
			<div class="h-full overflow-y-auto">
			{#if error}
				<div class="p-6 text-sm text-red-500" role="alert">{error}</div>
			{:else if hasDocument}
				<article class="md-preview mx-auto max-w-3xl px-6 py-6">
					<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitized by DOMPurify in previewers/docx -->
					{@html rendered}
				</article>
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--c-muted)]">
					Upload a DOCX on the left to preview it here.
				</div>
			{/if}
			</div>
		</div>
	{/snippet}
</SplitLayout>

<ShareDialog bind:open={shareOpen} getPayload={() => fileBytes} />
<PasswordPrompt
	bind:open={prompts.open}
	error={prompts.error}
	attemptsLeft={prompts.attemptsLeft}
	onsubmit={prompts.submit}
	oncancel={prompts.cancel}
/>
