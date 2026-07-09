<script lang="ts">
	import type { Snippet } from 'svelte';

	// Animated pager: keeps the previous, current and next pages mounted in a
	// stack so neighbours are already rendered when the user navigates — no
	// flash — and slides/fades between them. Off-screen pages are transparent
	// but laid out, which also lets lazy renderers (IntersectionObserver)
	// prerender them.
	let {
		current,
		count,
		page
	}: { current: number; count: number; page: Snippet<[number]> } = $props();

	const mounted = $derived(
		[current - 1, current, current + 1].filter((i) => i >= 0 && i < count)
	);
</script>

<div class="relative h-full w-full overflow-hidden">
	{#each mounted as i (i)}
		<div
			class="absolute inset-0 transition-[transform,opacity] duration-300 ease-out"
			style="transform: translateX({(i - current) * 8}%); opacity: {i === current
				? 1
				: 0}; z-index: {i === current ? 1 : 0}; pointer-events: {i === current
				? 'auto'
				: 'none'};"
		>
			{@render page(i)}
		</div>
	{/each}
</div>
