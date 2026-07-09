<script lang="ts">
	import { Link, Settings } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { registry } from '$lib/registry';
	import { shareHandler } from '$lib/stores/view';
	import ViewModeToggle from './ViewModeToggle.svelte';
	import SettingsDialog from './SettingsDialog.svelte';

	const ext = $derived.by(() => {
		const segment = ($page.route.id ?? '').split('/').filter(Boolean)[0];
		return registry.some((p) => p.ext === segment) ? segment : null;
	});

	let settingsOpen = $state(false);
</script>

<header
	class="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--c-border)] bg-[var(--c-surface)] px-4"
>
	<span class="flex items-baseline font-semibold tracking-tight">
		<a href="{base}/" class="text-[var(--c-fg)]">preview</a>
		{#if ext}
			<span class="relative">
				<select
					value={ext}
					onchange={(e) => goto(`${base}/${e.currentTarget.value}/`)}
					aria-label="Switch previewer"
					class="cursor-pointer appearance-none bg-transparent pr-3 font-semibold text-[var(--c-accent)] focus:outline-none"
				>
					{#each registry as p (p.ext)}
						<option value={p.ext}>.{p.ext}</option>
					{/each}
				</select>
				<span
					aria-hidden="true"
					class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-[var(--c-muted)]">▾</span
				>
			</span>
		{/if}
	</span>
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
	<button
		type="button"
		aria-label="Settings"
		title="Settings"
		class="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1.5 text-[var(--c-muted)] transition-colors hover:text-[var(--c-fg)]"
		onclick={() => (settingsOpen = true)}
	>
		<Settings size={16} aria-hidden="true" />
	</button>
</header>

<SettingsDialog bind:open={settingsOpen} />
