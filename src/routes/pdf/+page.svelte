<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import PreviewLoading from '$lib/components/PreviewLoading.svelte';
	import PreviewChrome from '$lib/components/PreviewChrome.svelte';
	import FileActions from '$lib/components/FileActions.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import PdfPageCanvas from '$lib/previewers/pdf/PdfPageCanvas.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { saveFileContent, loadFileContent } from '$lib/storage';
	import type { PDFDocumentProxy } from 'pdfjs-dist';

	const EXT = 'pdf';

	type PdfModule = typeof import('$lib/previewers/pdf');

	let fileBytes: Uint8Array | null = null;
	let fileName = $state('');
	let pdf: PDFDocumentProxy | null = $state(null);
	let pdfMod: PdfModule | null = $state(null);
	let loading = $state(false);
	let error = $state('');
	let shareOpen = $state(false);
	let destroyed = false;

	let scroller: HTMLDivElement | undefined = $state();
	let pageWidth = $state(720);

	const prompts = new PromptController();

	async function loadBytes(bytes: Uint8Array, name: string) {
		loading = true;
		error = '';
		try {
			pdfMod ??= await import('$lib/previewers/pdf');
			if (destroyed) return;
			const previous = pdf;
			// pdf.js transfers the buffer → keep our copy for sharing, hand it a clone
			const document = await pdfMod.loadPdf(bytes.slice());
			if (destroyed) return;
			fileBytes = bytes;
			fileName = name;
			pdf = document;
			void previous?.destroy();
			// zoom-to-fit-width for the current pane
			pageWidth = Math.max(320, Math.min((scroller?.clientWidth ?? 760) - 48, 1100));
		} catch {
			error = 'Could not open this file as a PDF.';
		} finally {
			loading = false;
		}
	}

	async function onUpload(file: File) {
		const bytes = new Uint8Array(await file.arrayBuffer());
		await loadBytes(bytes, file.name);
		if (!error) saveFileContent(EXT, file.name, bytes);
	}

	function clearDocument() {
		void pdf?.destroy();
		pdf = null;
		fileBytes = null;
		fileName = '';
		error = '';
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
				await loadBytes(bytes, 'shared.pdf');
			} catch (e) {
				loading = false;
				error = e instanceof Error ? e.message : 'Could not open this share link.';
			}
		})();

		return () => {
			destroyed = true;
			shareHandler.set(null);
			void pdf?.destroy();
		};
	});
</script>

<svelte:head>
	<title>preview.pdf — PDF previewer</title>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<div class="relative h-full">
			<UploadPanel
				accept="application/pdf,.pdf"
				label="Choose a PDF to preview"
				hint="rendered locally, never uploaded"
				{fileName}
				onfile={onUpload}
			/>
			<FileActions ext={EXT} {fileName} getBytes={() => fileBytes} onclear={clearDocument} />
		</div>
	{/snippet}
	{#snippet preview()}
		<div class="relative h-full">
			<PreviewLoading show={loading} label="Loading PDF…" />
			<PreviewChrome />
			<div bind:this={scroller} class="h-full overflow-y-auto bg-[var(--c-surface)]">
			{#if error}
				<div class="p-6 text-sm text-red-500" role="alert">{error}</div>
			{:else if pdf && pdfMod}
				{#key pdf}
					<div class="flex flex-col items-center gap-4 p-6">
						{#each Array(pdf.numPages) as _, i (i)}
							<PdfPageCanvas {pdf} pageNumber={i + 1} width={pageWidth} render={pdfMod.renderPage} />
						{/each}
						<p class="text-xs text-[var(--c-muted)]">{pdf.numPages} page{pdf.numPages === 1 ? '' : 's'}</p>
					</div>
				{/key}
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--c-muted)]">
					Upload a PDF on the left to preview it here.
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
