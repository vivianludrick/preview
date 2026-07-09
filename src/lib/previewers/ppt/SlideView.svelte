<script lang="ts">
	// pure renderer for a parsed slide — no pptx/jszip imports here
	import type { Deck } from './types';

	let { deck, index }: { deck: Deck; index: number } = $props();

	let hostW = $state(0);
	let hostH = $state(0);

	const slide = $derived(deck.slides[index]);
	const scale = $derived(Math.max(Math.min(hostW / deck.width, hostH / deck.height), 0) || 0);
</script>

<div
	bind:clientWidth={hostW}
	bind:clientHeight={hostH}
	class="flex h-full w-full items-center justify-center overflow-hidden"
>
	{#if slide && scale > 0}
		<div
			class="relative overflow-hidden shadow-lg"
			style="width: {deck.width * scale}px; height: {deck.height * scale}px; background: {slide.background ??
				'#ffffff'};"
		>
			<div
				class="absolute left-0 top-0"
				style="width: {deck.width}px; height: {deck.height}px; transform: scale({scale}); transform-origin: 0 0;"
			>
				{#each slide.elements as el, i (i)}
					{#if el.type === 'image' && el.src}
						<img
							src={el.src}
							alt=""
							style="position: absolute; left: {el.x}px; top: {el.y}px; width: {el.w}px; height: {el.h}px; object-fit: fill;"
						/>
					{:else if el.type === 'text'}
						<div
							style="position: absolute; left: {el.x}px; top: {el.y}px; width: {el.w}px; height: {el.h}px; background: {el.fill ??
								'transparent'}; display: flex; flex-direction: column; justify-content: {el.anchor ===
							'middle'
								? 'center'
								: el.anchor === 'bottom'
									? 'flex-end'
									: 'flex-start'}; overflow: hidden;"
						>
							{#each el.paragraphs as p, pi (pi)}
								<p
									style="margin: 0; text-align: {p.align}; padding-left: {p.level * 28}px; line-height: 1.3; white-space: pre-wrap;"
								>
									{#if p.bullet && p.runs.some((r) => r.text.trim())}<span
											style="color: {p.runs[0]?.color ?? deck.textColor};">•&nbsp;</span
										>{/if}
									{#each p.runs as run, ri (ri)}
										<span
											style="font-size: {run.size}px; font-weight: {run.bold
												? 700
												: 400}; font-style: {run.italic ? 'italic' : 'normal'}; text-decoration: {run.underline
												? 'underline'
												: 'none'}; color: {run.color ?? deck.textColor};">{run.text}</span
										>
									{/each}
									{#if p.runs.length === 0}&nbsp;{/if}
								</p>
							{/each}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
