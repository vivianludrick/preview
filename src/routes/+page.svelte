<script lang="ts">
	import {
		Search,
		FileText,
		FileType,
		Presentation,
		Table,
		Code,
		BookOpen,
		FileSpreadsheet,
		ArrowRight
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { registry } from '$lib/registry';

	let query = $state('');
	let active = $state(0);

	const icons: Record<string, typeof FileText> = {
		md: FileText,
		pdf: FileType,
		ppt: Presentation,
		csv: Table,
		html: Code,
		docx: BookOpen,
		xlsx: FileSpreadsheet
	};

	// randomly-sprinkled supported extensions (sketch) — hand-placed so they
	// never collide with the centered content, each linking to its previewer
	const scattered: { ext: string; style: string }[] = [
		{ ext: 'md', style: 'top: 24%; left: 10%; transform: rotate(-8deg)' },
		{ ext: 'csv', style: 'top: 11%; left: 34%; transform: rotate(4deg)' },
		{ ext: 'html', style: 'top: 16%; right: 12%; transform: rotate(7deg)' },
		{ ext: 'pdf', style: 'top: 48%; left: 6%; transform: rotate(3deg)' },
		{ ext: 'ppt', style: 'top: 42%; right: 7%; transform: rotate(-6deg)' },
		{ ext: 'docx', style: 'bottom: 20%; left: 16%; transform: rotate(6deg)' },
		{ ext: 'xlsx', style: 'bottom: 13%; right: 17%; transform: rotate(-4deg)' }
	];

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
		content="Preview markdown, CSV, HTML, PDF, PPTX, DOCX and XLSX entirely in your browser. Share via self-contained, optionally encrypted links. No server, no uploads, no tracking."
	/>
</svelte:head>

<div class="relative h-full overflow-y-auto">
	<!-- sprinkled extensions -->
	{#each scattered as s (s.ext)}
		<a
			href="{base}/{s.ext}/"
			style={s.style}
			class="absolute hidden font-mono text-lg text-[var(--c-muted)] opacity-60 transition hover:scale-110 hover:text-[var(--c-accent)] hover:opacity-100 md:block"
		>
			.{s.ext}
		</a>
	{/each}

	<div class="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-8 px-6 py-16">
		<!-- easter egg: this hero is a live HTML "preview" — click and edit it -->
		<div
			contenteditable="true"
			spellcheck="false"
			aria-label="Editable introduction — a little easter egg"
			class="text-center caret-[var(--c-accent)] outline-none [&:focus_h1]:opacity-90"
		>
			<h1 class="text-6xl font-bold tracking-tight">
				preview<span class="text-[var(--c-accent)]">*</span>
			</h1>
			<p class="mt-4 leading-relaxed text-[var(--c-muted)]">
				Render files entirely in your browser and share them as self-contained links —
				<br class="hidden sm:block" />
				no server, no uploads, no tracking. <span class="opacity-60">(psst — you can edit this text.)</span>
			</p>
		</div>

		<div class="w-full">
			<label
				class="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 focus-within:border-[var(--c-accent)]"
			>
				<Search size={18} class="shrink-0 text-[var(--c-muted)]" aria-hidden="true" />
				<input
					type="search"
					placeholder="file type…"
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
							class="flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors {i ===
							active
								? 'border-[var(--c-accent)] bg-[var(--c-surface)]'
								: 'border-[var(--c-border)]'}"
						>
							<Icon size={18} class="shrink-0 text-[var(--c-accent)]" aria-hidden="true" />
							<span class="min-w-0 flex-1">
								<span class="font-medium">{p.name}</span>
								<span class="ml-1.5 font-mono text-xs text-[var(--c-muted)]">/{p.ext}</span>
								<span class="block truncate text-sm text-[var(--c-muted)]">{p.description}</span>
							</span>
							<ArrowRight size={15} class="shrink-0 text-[var(--c-muted)]" aria-hidden="true" />
						</button>
					</li>
				{:else}
					<li class="px-4 py-3 text-sm text-[var(--c-muted)]">No previewer matches “{query}”.</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
