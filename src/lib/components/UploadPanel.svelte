<script lang="ts">
	import { Upload, FileCheck2 } from 'lucide-svelte';

	let {
		accept,
		label,
		hint = '',
		fileName = '',
		onfile
	}: {
		accept: string;
		label: string;
		hint?: string;
		fileName?: string;
		onfile: (file: File) => void;
	} = $props();

	let input: HTMLInputElement | undefined = $state();
	let dragging = $state(false);

	function handleFiles(files: FileList | null | undefined) {
		const file = files?.[0];
		if (file) onfile(file);
	}
</script>

<div class="flex h-full items-center justify-center overflow-y-auto p-6">
	<button
		type="button"
		onclick={() => input?.click()}
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={() => (dragging = false)}
		ondrop={(e) => {
			e.preventDefault();
			dragging = false;
			handleFiles(e.dataTransfer?.files);
		}}
		class="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-colors {dragging
			? 'border-[var(--c-accent)] bg-[var(--c-surface)]'
			: 'border-[var(--c-border)] hover:border-[var(--c-accent)]'}"
	>
		{#if fileName}
			<FileCheck2 size={28} class="text-[var(--c-accent)]" aria-hidden="true" />
			<span class="break-all text-sm font-medium">{fileName}</span>
			<span class="text-xs text-[var(--c-muted)]">Click or drop to replace</span>
		{:else}
			<Upload size={28} class="text-[var(--c-muted)]" aria-hidden="true" />
			<span class="text-sm font-medium">{label}</span>
			<span class="text-xs text-[var(--c-muted)]">Click to browse or drag &amp; drop{hint ? ` · ${hint}` : ''}</span>
		{/if}
	</button>
	<input
		bind:this={input}
		type="file"
		{accept}
		class="hidden"
		onchange={(e) => {
			handleFiles(e.currentTarget.files);
			e.currentTarget.value = '';
		}}
	/>
</div>
