<script lang="ts">
	import type { Snippet } from 'svelte';
	import { viewMode } from '$lib/stores/view';

	let { editor, preview }: { editor: Snippet; preview: Snippet } = $props();
</script>

<div class="flex h-full min-h-0">
	{#if $viewMode !== 'preview'}
		<section
			aria-label="Editor"
			class="min-h-0 min-w-0 {$viewMode === 'split' ? 'w-1/2 border-r border-[var(--c-border)]' : 'w-full'}"
		>
			{@render editor()}
		</section>
	{/if}
	{#if $viewMode !== 'editor'}
		<section aria-label="Preview" class="min-h-0 min-w-0 {$viewMode === 'split' ? 'w-1/2' : 'w-full'}">
			{@render preview()}
		</section>
	{/if}
</div>
