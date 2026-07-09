<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { initTheme } from '$lib/stores/theme';

	let { children } = $props();

	onMount(initTheme);
</script>

<div class="flex h-screen flex-col bg-[var(--c-bg)] text-[var(--c-fg)]">
	<Header />
	<main class="min-h-0 flex-1">
		{@render children()}
	</main>
</div>
