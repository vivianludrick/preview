<script lang="ts">
	import { Copy, Check, Scissors, LoaderCircle } from 'lucide-svelte';
	import InfoPopover from './InfoPopover.svelte';

	let {
		open = $bindable(false),
		getPayload
	}: {
		open: boolean;
		/** content to encode; null when there is nothing to share yet */
		getPayload: () => string | Uint8Array | null;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let password = $state('');
	let link = $state('');
	let generatedPassword: string | null = $state(null);
	let generating = $state(false);
	let shortening = $state(false);
	let notice = $state('');
	let copied = $state(false);

	// editing the password after generating makes the shown link stale
	const stale = $derived(link !== '' && generatedPassword !== null && password !== generatedPassword);
	const linkBytes = $derived(link.length); // base64url + ascii URL → 1 byte per char

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(2)} MB`;
	}

	async function generate() {
		const payload = getPayload();
		if (payload === null) return;
		generating = true;
		notice = '';
		copied = false;
		try {
			const { encodeShare } = await import('$lib/share/codec');
			const blob = await encodeShare(payload, password || undefined);
			link = `${location.origin}${location.pathname}?data=${blob}`;
			generatedPassword = password;
		} catch {
			notice = 'Could not generate the link.';
		} finally {
			generating = false;
		}
	}

	async function copy() {
		if (!link) return;
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			notice = 'Clipboard unavailable — select the link text and copy manually.';
		}
	}

	async function shorten() {
		if (!link || shortening) return;
		shortening = true;
		notice = '';
		try {
			const { shortenUrl } = await import('$lib/share/shorten');
			link = await shortenUrl(link);
		} catch {
			notice = "Couldn't shorten — using full link";
		} finally {
			shortening = false;
		}
	}
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	aria-label="Share this document"
	class="w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-0 text-[var(--c-fg)] shadow-2xl backdrop:bg-black/50"
>
	{#if open}
		<div class="flex flex-col gap-4 p-5">
			<h2 class="text-lg font-semibold">Share</h2>

			<div class="flex flex-col gap-1.5">
				<label for="share-password" class="flex items-center gap-1 text-sm font-medium">
					Password <span class="font-normal text-[var(--c-muted)]">(optional)</span>
					<InfoPopover
						text="Encrypted locally with AES-256-GCM before it ever leaves your browser. If the password is lost the data cannot be recovered — there is no reset."
					/>
				</label>
				<input
					id="share-password"
					type="password"
					bind:value={password}
					autocomplete="new-password"
					placeholder="Leave empty for an unencrypted link"
					class="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm placeholder:text-[var(--c-muted)] focus:border-[var(--c-accent)] focus:outline-none"
				/>
			</div>

			<button
				type="button"
				onclick={generate}
				disabled={generating}
				class="flex items-center justify-center gap-2 rounded-lg bg-[var(--c-accent)] px-3 py-2 text-sm font-medium text-[var(--c-accent-fg)] transition-opacity hover:opacity-90 disabled:opacity-60"
			>
				{#if generating}
					<LoaderCircle size={15} class="animate-spin" aria-hidden="true" /> Generating…
				{:else}
					{stale ? 'Regenerate Link' : 'Generate Link'}
				{/if}
			</button>

			{#if link}
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-1 text-sm font-medium">
						Link
						<InfoPopover
							text="The link contains your entire document — nothing is uploaded or stored anywhere."
						/>
						<span class="ml-auto text-xs font-normal text-[var(--c-muted)]">{formatBytes(linkBytes)}</span>
					</div>
					<div class="flex gap-2">
						<input
							type="text"
							readonly
							value={link}
							aria-label="Generated link"
							onfocus={(e) => e.currentTarget.select()}
							class="min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none {stale
								? 'border-amber-500 bg-amber-500/10 opacity-70'
								: 'border-[var(--c-border)] bg-[var(--c-surface)]'}"
						/>
						<button
							type="button"
							onclick={copy}
							class="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm hover:border-[var(--c-accent)]"
						>
							{#if copied}<Check size={14} aria-hidden="true" /> Copied{:else}<Copy
									size={14}
									aria-hidden="true"
								/> Copy{/if}
						</button>
					</div>
					{#if stale}
						<p class="text-xs text-amber-500">
							Password changed since this link was generated — it still uses the old password. Regenerate to
							apply the new one.
						</p>
					{/if}
					{#if linkBytes > 2 * 1024 * 1024}
						<p class="text-xs text-amber-500">
							Over 2 MB — longer than what most browsers can reliably open as a URL.
						</p>
					{:else if linkBytes > 8 * 1024}
						<p class="text-xs text-amber-500">
							Over 8 KB — very long URL; some apps truncate links this size when pasting.
						</p>
					{/if}
					<div class="mt-1 flex items-center gap-1">
						<button
							type="button"
							onclick={shorten}
							disabled={shortening}
							class="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-sm hover:border-[var(--c-accent)] disabled:opacity-60"
						>
							{#if shortening}
								<LoaderCircle size={14} class="animate-spin" aria-hidden="true" /> Shortening…
							{:else}
								<Scissors size={14} aria-hidden="true" /> Shorten
							{/if}
						</button>
						<InfoPopover
							text="Sends the generated link to an external URL-shortening service, which will store it. The content is still compressed/encrypted inside the link; only use this if that tradeoff is acceptable."
						/>
					</div>
				</div>
			{/if}

			{#if notice}
				<p role="status" class="text-sm text-[var(--c-muted)]">{notice}</p>
			{/if}

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
