<script lang="ts">
	// renders lazily via IntersectionObserver; receives the pdf proxy object
	// as a prop so this component never imports pdfjs itself
	import { onMount } from 'svelte';
	import type { PDFDocumentProxy } from 'pdfjs-dist';

	let {
		pdf,
		pageNumber,
		width,
		render
	}: {
		pdf: PDFDocumentProxy;
		pageNumber: number;
		width: number;
		render: (
			pdf: PDFDocumentProxy,
			pageNumber: number,
			canvas: HTMLCanvasElement,
			cssWidth: number
		) => Promise<{ cssHeight: number }>;
	} = $props();

	let host: HTMLDivElement | undefined = $state();
	let canvas: HTMLCanvasElement | undefined = $state();
	// fit-width is fixed at upload time, so capturing the initial width is intentional
	// svelte-ignore state_referenced_locally
	let height = $state(width * 1.294); // A4-ish placeholder until rendered
	let done = $state(false);
	let failed = $state(false);

	onMount(() => {
		let started = false;
		const observer = new IntersectionObserver(
			async (entries) => {
				if (!entries.some((e) => e.isIntersecting) || started) return;
				started = true;
				observer.disconnect();
				try {
					const { cssHeight } = await render(pdf, pageNumber, canvas!, width);
					height = cssHeight;
					done = true;
				} catch {
					failed = true;
				}
			},
			{ rootMargin: '400px' }
		);
		if (host) observer.observe(host);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={host}
	style="width: {width}px; min-height: {done ? 0 : height}px"
	class="relative bg-white shadow-md"
>
	<canvas bind:this={canvas} class="block" class:invisible={!done}></canvas>
	{#if !done && !failed}
		<div class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
			Page {pageNumber}…
		</div>
	{:else if failed}
		<div class="absolute inset-0 flex items-center justify-center text-xs text-red-500">
			Page {pageNumber} failed to render
		</div>
	{/if}
</div>
