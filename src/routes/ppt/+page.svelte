<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import PreviewLoading from '$lib/components/PreviewLoading.svelte';
	import PreviewChrome from '$lib/components/PreviewChrome.svelte';
	import FileActions from '$lib/components/FileActions.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import UploadPanel from '$lib/components/UploadPanel.svelte';
	import SlideView from '$lib/previewers/ppt/SlideView.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { saveFileContent, loadFileContent } from '$lib/storage';
	import type { Deck } from '$lib/previewers/ppt/types';

	const EXT = 'ppt';

	let fileBytes: Uint8Array | null = null;
	let fileName = $state('');
	let deck: Deck | null = $state(null);
	let current = $state(0);
	// full screen on this page IS presentation mode: only the current slide,
	// stepped with the chevrons or arrow keys — no filmstrip, no counter
	let presenting = $state(false);
	let loading = $state(false);
	let error = $state('');
	let shareOpen = $state(false);
	let destroyed = false;
	let dispose: ((deck: Deck) => void) | null = null;

	const prompts = new PromptController();

	async function loadBytes(bytes: Uint8Array, name: string) {
		loading = true;
		error = '';
		try {
			const mod = await import('$lib/previewers/ppt/parse');
			if (destroyed) return;
			dispose = mod.disposeDeck;
			const parsed = await mod.parsePptx(bytes);
			if (destroyed) {
				mod.disposeDeck(parsed);
				return;
			}
			if (deck) mod.disposeDeck(deck);
			fileBytes = bytes;
			fileName = name;
			deck = parsed;
			current = 0;
		} catch {
			error = 'Could not open this file as a PPTX presentation.';
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
		if (deck && dispose) dispose(deck);
		deck = null;
		fileBytes = null;
		fileName = '';
		current = 0;
		error = '';
	}

	function go(delta: number) {
		if (!deck) return;
		current = Math.min(Math.max(current + delta, 0), deck.slides.length - 1);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!deck || shareOpen || prompts.open) return;
		const target = event.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
		if (event.key === 'ArrowRight') go(1);
		if (event.key === 'ArrowLeft') go(-1);
	}

	onMount(() => {
		viewMode.set('split');
		shareHandler.set(() => (shareOpen = true));

		const onFullscreenChange = () => (presenting = !!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFullscreenChange);

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
					error = 'Password required to view this presentation. Reload the page to try again.';
					return;
				}
				await loadBytes(bytes, 'shared.pptx');
			} catch (e) {
				loading = false;
				error = e instanceof Error ? e.message : 'Could not open this share link.';
			}
		})();

		return () => {
			destroyed = true;
			document.removeEventListener('fullscreenchange', onFullscreenChange);
			shareHandler.set(null);
			if (deck && dispose) dispose(deck);
		};
	});
</script>

<svelte:head>
	<title>preview.ppt — PPTX previewer</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<SplitLayout>
	{#snippet editor()}
		<div class="relative h-full">
			<UploadPanel
				accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
				label="Choose a PPTX to preview"
				hint="parsed locally, never uploaded"
				{fileName}
				onfile={onUpload}
			/>
			<FileActions ext={EXT} {fileName} getBytes={() => fileBytes} onclear={clearDocument} />
		</div>
	{/snippet}
	{#snippet preview()}
		<div class="relative flex h-full flex-col bg-[var(--c-surface)]">
			<PreviewLoading show={loading} label="Parsing presentation…" />
			<PreviewChrome />
			{#if error}
				<div class="p-6 text-sm text-red-500" role="alert">{error}</div>
			{:else if deck}
				<div class="flex min-h-0 flex-1 items-stretch gap-1 p-4">
					<button
						type="button"
						aria-label="Previous slide"
						disabled={current === 0}
						onclick={() => go(-1)}
						class="shrink-0 self-center rounded-full p-1.5 text-[var(--c-muted)] hover:text-[var(--c-fg)] disabled:opacity-30"
					>
						<ChevronLeft size={22} aria-hidden="true" />
					</button>
					<div class="min-h-0 min-w-0 flex-1">
						<SlideView {deck} index={current} />
					</div>
					<button
						type="button"
						aria-label="Next slide"
						disabled={current === deck.slides.length - 1}
						onclick={() => go(1)}
						class="shrink-0 self-center rounded-full p-1.5 text-[var(--c-muted)] hover:text-[var(--c-fg)] disabled:opacity-30"
					>
						<ChevronRight size={22} aria-hidden="true" />
					</button>
				</div>
				{#if !presenting}
					<p class="pb-1 text-center text-xs text-[var(--c-muted)]">
						Slide {current + 1} / {deck.slides.length}
					</p>
					<!-- filmstrip -->
					<div class="flex shrink-0 gap-2 overflow-x-auto border-t border-[var(--c-border)] p-3">
					{#each deck.slides as _, i (i)}
						<button
							type="button"
							aria-label="Go to slide {i + 1}"
							aria-current={i === current}
							onclick={() => (current = i)}
							class="relative h-20 shrink-0 overflow-hidden rounded border-2 {i === current
								? 'border-[var(--c-accent)]'
								: 'border-[var(--c-border)] opacity-70 hover:opacity-100'}"
							style="aspect-ratio: {deck.width} / {deck.height};"
						>
							<SlideView {deck} index={i} />
							<span
								class="absolute bottom-0.5 right-1 rounded bg-black/50 px-1 text-[10px] text-white"
							>
								{i + 1}
							</span>
						</button>
					{/each}
					</div>
				{/if}
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--c-muted)]">
					Upload a PPTX on the left to preview the slides here.
				</div>
			{/if}
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
