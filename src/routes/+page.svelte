<script lang="ts">
	import { Search, FileText, FileType, Presentation, ArrowRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { registry } from '$lib/registry';

	let query = $state('');
	let active = $state(0);

	const icons: Record<string, typeof FileText> = {
		md: FileText,
		pdf: FileType,
		ppt: Presentation
	};

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return registry;
		return registry.filter(
			(p) =>
				p.ext.includes(q) ||
				p.name.toLowerCase().includes(q) ||
				p.description.toLowerCase().includes(q) ||
				p.keywords.some((k) => k.includes(q))
		);
	});

	$effect(() => {
		if (active >= results.length) active = 0;
	});

	function open(ext: string) {
		void goto(`${base}/${ext}/`);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = (active + 1) % Math.max(results.length, 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = (active + Math.max(results.length, 1) - 1) % Math.max(results.length, 1);
		} else if (event.key === 'Enter' && results[active]) {
			open(results[active].ext);
		}
	}
</script>

<svelte:head>
	<title>preview — client-side file previewer</title>
	<meta
		name="description"
		content="Preview markdown, PDF and PPTX files entirely in your browser. Share via self-contained, optionally encrypted links. No server, no uploads, no tracking."
	/>
</svelte:head>

<div class="h-full overflow-y-auto">
	<div class="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 py-16">
		<div class="text-center">
			<h1 class="text-4xl font-bold tracking-tight">
				preview<span class="text-[var(--c-accent)]">.anything</span>
			</h1>
			<p class="mt-4 leading-relaxed text-[var(--c-muted)]">
				Type or upload on the left, see it rendered on the right — entirely in your browser.
				Nothing is ever uploaded. Share documents as self-contained links: the content is
				compressed (and optionally AES-encrypted) <em>into the URL itself</em>.
			</p>
		</div>

		<div class="w-full">
			<label
				class="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 focus-within:border-[var(--c-accent)]"
			>
				<Search size={18} class="shrink-0 text-[var(--c-muted)]" aria-hidden="true" />
				<input
					type="search"
					placeholder="Search previewers… (markdown, pdf, slides)"
					aria-label="Search previewers"
					bind:value={query}
					onkeydown={onKeydown}
					class="w-full bg-transparent text-sm focus:outline-none"
				/>
			</label>

			<ul class="mt-3 flex flex-col gap-2" role="listbox" aria-label="Previewers">
				{#each results as p, i (p.ext)}
					{@const Icon = icons[p.ext] ?? FileText}
					<li role="option" aria-selected={i === active}>
						<button
							type="button"
							onclick={() => open(p.ext)}
							onmouseenter={() => (active = i)}
							class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors {i ===
							active
								? 'border-[var(--c-accent)] bg-[var(--c-surface)]'
								: 'border-[var(--c-border)]'}"
						>
							<Icon size={20} class="shrink-0 text-[var(--c-accent)]" aria-hidden="true" />
							<span class="min-w-0 flex-1">
								<span class="font-medium">{p.name}</span>
								<span class="ml-1.5 font-mono text-xs text-[var(--c-muted)]">/{p.ext}</span>
								<span class="block truncate text-sm text-[var(--c-muted)]">{p.description}</span>
							</span>
							<ArrowRight size={16} class="shrink-0 text-[var(--c-muted)]" aria-hidden="true" />
						</button>
					</li>
				{:else}
					<li class="px-4 py-3 text-sm text-[var(--c-muted)]">No previewer matches “{query}”.</li>
				{/each}
			</ul>
		</div>

		<p class="max-w-md text-center text-xs leading-relaxed text-[var(--c-muted)]">
			Zero server · zero telemetry · zero CDN. The only network request this site ever makes on
			your behalf is the optional, user-initiated link shortening.
		</p>
	</div>
</div>
