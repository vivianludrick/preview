<script lang="ts">
	import { Info } from 'lucide-svelte';

	let { text }: { text: string } = $props();
	let open = $state(false);
</script>

<span class="relative inline-flex">
	<button
		type="button"
		aria-label="More information"
		aria-expanded={open}
		class="rounded p-0.5 text-[var(--c-muted)] hover:text-[var(--c-fg)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--c-accent)]"
		onclick={() => (open = !open)}
		onblur={() => (open = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape' && open) {
				e.stopPropagation();
				open = false;
			}
		}}
	>
		<Info size={14} aria-hidden="true" />
	</button>
	{#if open}
		<span
			role="note"
			class="absolute left-1/2 top-full z-20 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-2.5 text-xs leading-relaxed text-[var(--c-fg)] shadow-lg"
		>
			{text}
		</span>
	{/if}
</span>
