<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { LoaderCircle } from 'lucide-svelte';
	import SplitLayout from '$lib/components/SplitLayout.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import PasswordPrompt from '$lib/components/PasswordPrompt.svelte';
	import EditorChrome from '$lib/components/EditorChrome.svelte';
	import { viewMode, shareHandler } from '$lib/stores/view';
	import { PromptController } from '$lib/share/prompt.svelte';
	import { saveTextContent, loadTextContent } from '$lib/storage';
	import { SAMPLE_CSV } from '$lib/previewers/csv/sample';
	import type { CsvResult } from '$lib/previewers/csv/parse';
	import type { EditorView } from '$lib/editor/base';

	const EXT = 'csv';

	let content = $state(SAMPLE_CSV);
	let table: CsvResult | null = $state(null);
	let parserReady = $state(false);
	let receiveError = $state('');
	let receiveCancelled = $state(false);
	let shareOpen = $state(false);

	let parseCsv: ((text: string) => CsvResult) | null = null;
	let editorHost: HTMLDivElement | undefined = $state();
	let editorView: EditorView | null = $state(null);
	let editorReady = $state(false);

	const prompts = new PromptController();

	let renderTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleRender() {
		clearTimeout(renderTimer);
		renderTimer = setTimeout(() => {
			if (parseCsv) table = parseCsv(content);
		}, 120);
	}

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	function schedulePersist() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => saveTextContent(EXT, content), 400);
	}

	function onEdit(value: string) {
		content = value;
		scheduleRender();
		schedulePersist();
	}

	onMount(() => {
		viewMode.set('split');
		shareHandler.set(() => (shareOpen = true));
		let destroyed = false;

		(async () => {
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
			} else {
				const stored = loadTextContent(EXT);
				if (stored !== null) content = stored;
			}

			const mod = await import('$lib/previewers/csv/parse');
			if (destroyed) return;
			parseCsv = mod.parseCsv;
			table = parseCsv(content);
			parserReady = true;

			const ed = await import('$lib/previewers/csv/editor');
			await tick();
			if (destroyed || !editorHost) return;
			editorView = ed.createEditor(editorHost, content, onEdit);
			editorReady = true;
		})();

		return () => {
			destroyed = true;
			clearTimeout(renderTimer);
			clearTimeout(saveTimer);
			shareHandler.set(null);
			editorView?.destroy();
		};
	});
</script>

<svelte:head>
	<title>preview.csv — CSV previewer</title>
</svelte:head>

<SplitLayout>
	{#snippet editor()}
		<div class="relative h-full">
			<textarea
				class="h-full w-full resize-none bg-[var(--c-bg)] p-3 font-mono text-sm text-[var(--c-fg)] focus:outline-none {editorReady
					? 'hidden'
					: ''}"
				aria-label="CSV source"
				bind:value={content}
				oninput={() => {
					scheduleRender();
					schedulePersist();
				}}
			></textarea>
			<div bind:this={editorHost} class="h-full {editorReady ? '' : 'hidden'}"></div>
			<EditorChrome view={editorView} />
		</div>
	{/snippet}
	{#snippet preview()}
		<div class="h-full overflow-auto">
			{#if receiveError}
				<div class="p-6 text-sm text-red-500" role="alert">{receiveError}</div>
			{:else if receiveCancelled}
				<div class="p-6 text-sm text-[var(--c-muted)]">
					Password required to view this document. Reload the page to try again.
				</div>
			{:else if !parserReady || !table}
				<div class="flex h-full items-center justify-center gap-2 text-[var(--c-muted)]">
					<LoaderCircle size={18} class="animate-spin" aria-hidden="true" />
					<span class="text-sm">Loading preview…</span>
				</div>
			{:else if table.rows.length === 0}
				<div class="p-6 text-sm text-[var(--c-muted)]">Nothing to preview yet — type some CSV.</div>
			{:else}
				<div class="p-4">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr>
								{#each table.rows[0] as cell, i (i)}
									<th
										class="sticky top-0 border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-left font-semibold"
									>
										{cell}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each table.rows.slice(1) as row, ri (ri)}
								<tr class="odd:bg-[var(--c-surface)]/40">
									{#each row as cell, ci (ci)}
										<td class="border border-[var(--c-border)] px-3 py-1.5 align-top">{cell}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
					<p class="mt-2 text-xs text-[var(--c-muted)]">
						{table.rows.length - 1} row{table.rows.length === 2 ? '' : 's'} ·
						delimiter “{table.delimiter === '\t' ? 'tab' : table.delimiter}”
						{#if table.truncated}· preview truncated at 5,000 rows{/if}
					</p>
				</div>
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
