<script lang="ts">
	import { Pencil, SquareSplitHorizontal, Eye } from 'lucide-svelte';
	import { viewMode, type ViewMode } from '$lib/stores/view';

	const modes: { id: ViewMode; label: string; icon: typeof Pencil }[] = [
		{ id: 'editor', label: 'Editor', icon: Pencil },
		{ id: 'split', label: 'Split', icon: SquareSplitHorizontal },
		{ id: 'preview', label: 'Preview', icon: Eye }
	];

	let buttons: HTMLButtonElement[] = [];

	function onKeydown(event: KeyboardEvent, index: number) {
		let next = -1;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % modes.length;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + modes.length - 1) % modes.length;
		if (next === -1) return;
		event.preventDefault();
		viewMode.set(modes[next].id);
		buttons[next]?.focus();
	}
</script>

<div
	role="radiogroup"
	aria-label="View mode"
	class="flex items-center rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-0.5"
>
	{#each modes as mode, i (mode.id)}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={$viewMode === mode.id}
			aria-label={mode.label}
			title={mode.label}
			tabindex={$viewMode === mode.id ? 0 : -1}
			class="rounded-md p-1.5 transition-colors {$viewMode === mode.id
				? 'bg-[var(--c-accent)] text-[var(--c-accent-fg)]'
				: 'text-[var(--c-muted)] hover:text-[var(--c-fg)]'}"
			onclick={() => viewMode.set(mode.id)}
			onkeydown={(e) => onKeydown(e, i)}
		>
			<mode.icon size={16} aria-hidden="true" />
		</button>
	{/each}
</div>
