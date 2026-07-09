<script lang="ts">
	import { Palette } from 'lucide-svelte';
	import { theme, themes, setTheme } from '$lib/stores/theme';
</script>

<label
	class="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1 text-sm text-[var(--c-fg)]"
>
	<Palette size={14} aria-hidden="true" class="text-[var(--c-muted)]" />
	<span class="sr-only">Theme</span>
	<select
		value={$theme}
		onchange={(e) => setTheme(e.currentTarget.value)}
		class="cursor-pointer bg-transparent text-sm focus:outline-none"
	>
		{#each themes as t (t.id)}
			<option value={t.id}>{t.label}</option>
		{/each}
	</select>
</label>
