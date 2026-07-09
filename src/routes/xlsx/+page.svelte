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
	import type { Workbook } from '$lib/previewers/xlsx';

	const EXT = 'xlsx';

	let fileBytes: Uint8Array | null = null;
	let fileName = $state('');
	let workbook: Workbook | null = $state(null);
	let activeSheet = $state(0);
	let loading = $state(false);
	let error = $state('');
	let shareOpen = $state(false);
	let destroyed = false;

	const prompts = new PromptController();

	async function loadBytes(bytes: Uint8Array, name: string) {
		loading = true;
		error = '';
		try {
			const mod = await import('$lib/previewers/xlsx');
			if (destroyed) return;
			const parsed = mod.parseWorkbook(bytes);
			if (destroyed) return;
			fileBytes = bytes;
			fileName = name;
			workbook = parsed;
			activeSheet = 0;
		} catch {
			error = 'Could not open this file as an XLSX workbook.';
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
					error = 'Password required to view this workbook. Reload the page to try again.';
					return;
				}
				await loadBytes(bytes, 'shared.xlsx');
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
	<title>preview.xlsx — Excel previewer</title>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<UploadPanel
			accept=".xlsx,.xls,.ods,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			label="Choose an XLSX to preview"
			hint="parsed locally, never uploaded"
			{fileName}
			onfile={onUpload}
		/>
	{/snippet}
	{#snippet preview()}
		<div class="relative flex h-full flex-col">
			<PreviewLoading show={loading} label="Parsing workbook…" />
			{#if error}
				<div class="p-6 text-sm text-red-500" role="alert">{error}</div>
			{:else if workbook}
				{@const sheet = workbook.sheets[activeSheet]}
				<div
					role="tablist"
					aria-label="Sheets"
					class="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--c-border)] bg-[var(--c-surface)] px-2 pt-2"
				>
					{#each workbook.sheets as s, i (i)}
						<button
							type="button"
							role="tab"
							aria-selected={i === activeSheet}
							onclick={() => (activeSheet = i)}
							class="rounded-t-lg border border-b-0 px-3 py-1.5 text-sm {i === activeSheet
								? 'border-[var(--c-border)] bg-[var(--c-bg)] font-medium'
								: 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-fg)]'}"
						>
							{s.name}
						</button>
					{/each}
				</div>
				<div class="min-h-0 flex-1 overflow-auto p-4">
					{#if sheet.rows.length === 0}
						<p class="text-sm text-[var(--c-muted)]">This sheet is empty.</p>
					{:else}
						<table class="border-collapse text-sm">
							<tbody>
								{#each sheet.rows as row, ri (ri)}
									<tr class={ri === 0 ? 'bg-[var(--c-surface)] font-semibold' : 'odd:bg-[var(--c-surface)]/40'}>
										{#each row as cell, ci (ci)}
											<td class="border border-[var(--c-border)] px-3 py-1.5 align-top">{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						{#if sheet.truncated}
							<p class="mt-2 text-xs text-[var(--c-muted)]">Preview truncated at 2,000 rows.</p>
						{/if}
					{/if}
				</div>
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--c-muted)]">
					Upload an XLSX on the left to preview the sheets here.
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
