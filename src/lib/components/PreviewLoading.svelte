<script lang="ts">
	import { LoaderCircle } from 'lucide-svelte';

	// Loading screen laid over a preview pane (the pane needs `relative`):
	// whatever is already rendered stays visible, dimmed, underneath.
	let { show, label = 'Rendering…' }: { show: boolean; label?: string } = $props();
</script>

{#if show}
	<div
		role="status"
		aria-live="polite"
		class="absolute inset-0 z-20 flex items-center justify-center bg-[var(--c-bg)]/60 backdrop-blur-[2px]"
	>
		<span
			class="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-2.5 text-sm text-[var(--c-muted)] shadow-lg"
		>
			<LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
			{label}
		</span>
	</div>
{/if}
