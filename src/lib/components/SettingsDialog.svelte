<script lang="ts">
	import { Palette, Sparkles, HardDrive, Trash2, Check, X } from 'lucide-svelte';
	import InfoTip from './InfoTip.svelte';
	import { theme, themes, setTheme } from '$lib/stores/theme';
	import { geminiKey, setGeminiKey, geminiModel, setGeminiModel } from '$lib/stores/settings';
	import {
		localUsageBytes,
		clearStoredContent,
		clearOfflineCache,
		formatBytes
	} from '$lib/storage';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let keyDraft = $state('');
	let keySaved = $state(false);
	let localUsage = $state(0);
	let offlineUsage = $state<number | null>(null);
	let cleared = $state(false);

	// Gemini models the user can pick from: the static fallback until the live
	// list is fetched from the API with the user's own key.
	let models = $state<{ id: string; label: string }[]>([]);
	let modelsLive = $state(false);

	// keep the stored choice selectable even if it's not in the current list
	const modelOptions = $derived(
		models.some((m) => m.id === $geminiModel)
			? models
			: [{ id: $geminiModel, label: $geminiModel }, ...models]
	);

	async function loadModels(key: string) {
		const gemini = await import('$lib/ai/gemini');
		if (!models.length) models = gemini.FALLBACK_MODELS.map((id) => ({ id, label: id }));
		if (!key || modelsLive) return;
		try {
			models = await gemini.listModels(key);
			modelsLive = true;
		} catch {
			/* offline or bad key — the fallback list stays */
		}
	}

	async function refreshUsage() {
		localUsage = localUsageBytes();
		try {
			const estimate = await navigator.storage?.estimate?.();
			offlineUsage = estimate?.usage ?? null;
		} catch {
			offlineUsage = null;
		}
	}

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			keyDraft = $geminiKey;
			keySaved = false;
			cleared = false;
			void refreshUsage();
			void loadModels($geminiKey);
			dialog.showModal();
		}
		if (!open && dialog.open) dialog.close();
	});

	function saveKey() {
		setGeminiKey(keyDraft);
		keyDraft = $geminiKey;
		keySaved = true;
		setTimeout(() => (keySaved = false), 1500);
		// a fresh key may unlock the live model list
		modelsLive = false;
		void loadModels($geminiKey);
	}

	function removeKey() {
		setGeminiKey('');
		keyDraft = '';
	}

	async function clearCache() {
		clearStoredContent();
		await clearOfflineCache();
		cleared = true;
		await refreshUsage();
		setTimeout(() => (cleared = false), 1500);
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions — the handler
     only closes on backdrop clicks; content interactions are untouched -->
<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onmousedown={(e) => {
		// with p-0 every click inside the content targets a child, so a
		// mousedown targeting the dialog itself can only be on the backdrop
		if (e.target === dialog) open = false;
	}}
	aria-label="Settings"
	class="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-0 text-[var(--c-fg)] shadow-2xl backdrop:bg-black/50"
>
	{#if open}
		<div class="flex flex-col gap-5 p-5">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Settings</h2>
				<button
					type="button"
					aria-label="Close settings"
					onclick={() => (open = false)}
					class="rounded-lg p-1 text-[var(--c-muted)] hover:text-[var(--c-fg)]"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			<section class="flex items-center justify-between gap-3">
				<h3 class="flex items-center gap-1.5 text-sm font-medium">
					<Palette size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> Theme
					<InfoTip
						text="Follows your system's light/dark preference until you pick one explicitly."
					/>
				</h3>
				<select
					value={$theme}
					onchange={(e) => setTheme(e.currentTarget.value)}
					aria-label="Theme"
					class="w-48 cursor-pointer rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm focus:border-[var(--c-accent)] focus:outline-none"
				>
					{#each themes as t (t.id)}
						<option value={t.id}>{t.label}{t.dark ? ' · dark' : ' · light'}</option>
					{/each}
				</select>
			</section>

			<section class="flex flex-col gap-2">
				<div class="flex items-center justify-between gap-3">
					<h3 class="flex items-center gap-1.5 text-sm font-medium">
						<Sparkles size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> AI (Gemini)
						<InfoTip
							text="The key is stored only in this browser's localStorage and sent only to Google's Gemini API when you click the AI button in an editor. Leave it empty to hide the AI button. {modelsLive
								? `Model list fetched live from your key (${models.length} models).`
								: 'Model list is built-in — save a valid key to fetch every model available to you.'}"
						/>
					</h3>
					<select
						value={$geminiModel}
						onchange={(e) => setGeminiModel(e.currentTarget.value)}
						aria-label="Gemini model"
						class="w-48 cursor-pointer rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-[var(--c-fg)] focus:border-[var(--c-accent)] focus:outline-none"
					>
						{#each modelOptions as m (m.id)}
							<option value={m.id}>{m.label}</option>
						{/each}
					</select>
				</div>
				<div class="flex gap-2">
					<input
						type="password"
						bind:value={keyDraft}
						placeholder="Gemini API key"
						aria-label="Gemini API key"
						autocomplete="off"
						class="min-w-0 flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm placeholder:text-[var(--c-muted)] focus:border-[var(--c-accent)] focus:outline-none"
					/>
					<button
						type="button"
						onclick={saveKey}
						class="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm hover:border-[var(--c-accent)]"
					>
						{#if keySaved}<Check size={14} aria-hidden="true" /> Saved{:else}Save{/if}
					</button>
					{#if $geminiKey}
						<button
							type="button"
							aria-label="Remove API key"
							title="Remove the API key from this browser"
							onclick={removeKey}
							class="flex items-center rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-2.5 py-2 text-sm text-red-500 hover:border-red-500"
						>
							<Trash2 size={14} aria-hidden="true" />
						</button>
					{/if}
				</div>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="flex items-center gap-1.5 text-sm font-medium">
					<HardDrive size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> Storage
					<InfoTip
						text="“Clear cached data” removes locally saved documents and the offline cache. Theme choice and API key are kept."
					/>
				</h3>
				<div class="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm">
					<div class="flex justify-between">
						<span class="text-[var(--c-muted)]">Saved documents &amp; settings</span>
						<span>{formatBytes(localUsage)}</span>
					</div>
					{#if offlineUsage !== null}
						<div class="mt-1 flex justify-between">
							<span class="text-[var(--c-muted)]">Offline cache (site total)</span>
							<span>{formatBytes(offlineUsage)}</span>
						</div>
					{/if}
				</div>
				<button
					type="button"
					onclick={clearCache}
					class="flex items-center justify-center gap-1.5 self-start rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm text-red-500 hover:border-red-500"
				>
					{#if cleared}<Check size={14} aria-hidden="true" /> Cleared{:else}<Trash2
							size={14}
							aria-hidden="true"
						/> Clear cached data{/if}
				</button>
			</section>
		</div>
	{/if}
</dialog>
