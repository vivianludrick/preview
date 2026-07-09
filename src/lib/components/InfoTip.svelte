<script lang="ts">
	import { Info } from 'lucide-svelte';

	// A little "i" that reveals its explanation on hover/focus or click,
	// so dialogs don't have to spend space on always-visible descriptions.
	let { text }: { text: string } = $props();
	let open = $state(false);
</script>

<span class="relative inline-flex">
	<button
		type="button"
		aria-label="More info"
		aria-expanded={open}
		onclick={() => (open = !open)}
		onblur={() => (open = false)}
		class="peer inline-flex text-[var(--c-muted)] hover:text-[var(--c-fg)]"
	>
		<Info size={13} aria-hidden="true" />
	</button>
	<span
		role="tooltip"
		class="absolute left-0 top-full z-30 mt-1.5 w-64 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-xs font-normal normal-case text-[var(--c-muted)] shadow-lg {open
			? ''
			: 'hidden peer-hover:block peer-focus-visible:block'}"
	>
		{text}
	</span>
</span>
