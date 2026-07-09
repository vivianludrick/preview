<script lang="ts">
	import { Eraser, Download } from 'lucide-svelte';
	import ActionRail from './ActionRail.svelte';
	import { downloadBlob } from '$lib/download';
	import { clearContent } from '$lib/storage';

	// Upload-previewer counterpart of EditorChrome: clear unloads the current
	// document (and forgets it in localStorage), download saves the original
	// file bytes back to disk.
	let {
		ext,
		fileName,
		getBytes,
		onclear
	}: {
		ext: string;
		fileName: string;
		getBytes: () => Uint8Array | null;
		onclear: () => void;
	} = $props();

	function clear() {
		clearContent(ext);
		onclear();
	}

	function download() {
		const bytes = getBytes();
		if (!bytes) return;
		downloadBlob(
			new Blob([bytes as BlobPart], { type: 'application/octet-stream' }),
			fileName || `document.${ext}`
		);
	}
</script>

{#if fileName}
	<ActionRail>
		<button
			type="button"
			title="Clear the loaded document"
			onclick={clear}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-red-500"
		>
			<Eraser size={13} aria-hidden="true" /> clear
		</button>
		<button
			type="button"
			title="Download {fileName}"
			onclick={download}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-[var(--c-fg)]"
		>
			<Download size={13} aria-hidden="true" /> download
		</button>
	</ActionRail>
{/if}
