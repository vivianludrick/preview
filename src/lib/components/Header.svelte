<script lang="ts">
	import { Link } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { registry } from '$lib/registry';
	import { shareHandler } from '$lib/stores/view';
	import ViewModeToggle from './ViewModeToggle.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	const ext = $derived.by(() => {
		const segment = ($page.route.id ?? '').split('/').filter(Boolean)[0];
		return registry.some((p) => p.ext === segment) ? segment : null;
	});
</script>

<header
	class="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-4"
>
	<a href="{base}/" class="font-semibold tracking-tight text-[var(--c-fg)]">
		preview{#if ext}<span class="text-[var(--c-accent)]">.{ext}</span>{/if}
	</a>
	<div class="flex-1"></div>
	{#if ext}
		<ViewModeToggle />
		<button
			type="button"
			aria-label="Share"
			title="Share"
			disabled={!$shareHandler}
			class="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1.5 text-[var(--c-muted)] transition-colors hover:text-[var(--c-fg)] disabled:cursor-not-allowed disabled:opacity-40"
			onclick={() => $shareHandler?.()}
		>
			<Link size={16} aria-hidden="true" />
		</button>
	{/if}
	<ThemeToggle />
</header>
