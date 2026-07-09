<script lang="ts">
	import { Palette, Sparkles, HardDrive, Trash2, Check } from 'lucide-svelte';
	import { theme, themes, setTheme } from '$lib/stores/theme';
	import { geminiKey, setGeminiKey } from '$lib/stores/settings';
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
			dialog.showModal();
		}
		if (!open && dialog.open) dialog.close();
	});

	function saveKey() {
		setGeminiKey(keyDraft);
		keyDraft = $geminiKey;
		keySaved = true;
		setTimeout(() => (keySaved = false), 1500);
	}

	async function clearCache() {
		clearStoredContent();
		await clearOfflineCache();
		cleared = true;
		await refreshUsage();
		setTimeout(() => (cleared = false), 1500);
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	aria-label="Settings"
	class="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-0 text-[var(--c-fg)] shadow-2xl backdrop:bg-black/50"
>
	{#if open}
		<div class="flex flex-col gap-5 p-5">
			<h2 class="text-lg font-semibold">Settings</h2>

			<section class="flex flex-col gap-2">
				<h3 class="flex items-center gap-2 text-sm font-medium">
					<Palette size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> Theme
				</h3>
				<select
					value={$theme}
					onchange={(e) => setTheme(e.currentTarget.value)}
					aria-label="Theme"
					class="cursor-pointer rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm focus:border-[var(--c-accent)] focus:outline-none"
				>
					{#each themes as t (t.id)}
						<option value={t.id}>{t.label}{t.dark ? ' · dark' : ' · light'}</option>
					{/each}
				</select>
				<p class="text-xs text-[var(--c-muted)]">
					Follows your system's light/dark preference until you pick one explicitly.
				</p>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="flex items-center gap-2 text-sm font-medium">
					<Sparkles size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> AI (Gemini)
				</h3>
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
				</div>
				<p class="text-xs text-[var(--c-muted)]">
					Stored only in this browser's localStorage and sent only to Google's Gemini API when you
					click the AI button in an editor. Leave empty to hide the AI button.
				</p>
			</section>

			<section class="flex flex-col gap-2">
				<h3 class="flex items-center gap-2 text-sm font-medium">
					<HardDrive size={15} class="text-[var(--c-accent)]" aria-hidden="true" /> Storage
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
				<p class="text-xs text-[var(--c-muted)]">
					Removes locally saved documents and the offline cache. Theme choice and API key are kept.
				</p>
			</section>

			<button
				type="button"
				onclick={() => (open = false)}
				class="self-end rounded-lg px-3 py-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-fg)]"
			>
				Close
			</button>
		</div>
	{/if}
</dialog>
