<script lang="ts">
	import { onMount } from 'svelte';
	import { Maximize2, Minimize2 } from 'lucide-svelte';
	import ActionRail from './ActionRail.svelte';

	// Canva-style present mode: the preview pane element itself goes browser
	// fullscreen — no site header, no browser chrome, just the document.
	// The rail lives inside the pane, so "exit" (and Esc) work while presenting.
	let anchor: HTMLElement | undefined = $state();
	let fullscreen = $state(false);

	function pane(): HTMLElement | null {
		return anchor?.parentElement ?? null;
	}

	async function enter() {
		const el = pane() as
			| (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
			| null;
		if (!el) return;
		try {
			if (el.requestFullscreen) await el.requestFullscreen();
			else await el.webkitRequestFullscreen?.();
		} catch {
			/* fullscreen denied (e.g. iframe permissions) — nothing to do */
		}
	}

	function exit() {
		void document.exitFullscreen?.();
	}

	onMount(() => {
		const onChange = () =>
			(fullscreen = !!document.fullscreenElement && document.fullscreenElement === pane());
		document.addEventListener('fullscreenchange', onChange);
		return () => document.removeEventListener('fullscreenchange', onChange);
	});
</script>

<span bind:this={anchor} class="hidden" aria-hidden="true"></span>
<ActionRail>
	{#if fullscreen}
		<button
			type="button"
			title="Exit full screen (Esc)"
			onclick={exit}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-[var(--c-fg)]"
		>
			<Minimize2 size={13} aria-hidden="true" /> exit
		</button>
	{:else}
		<button
			type="button"
			title="Present the preview full screen"
			onclick={enter}
			class="flex items-center gap-2 px-3 py-2 hover:bg-[var(--c-bg)] hover:text-[var(--c-fg)]"
		>
			<Maximize2 size={13} aria-hidden="true" /> full screen
		</button>
	{/if}
</ActionRail>
