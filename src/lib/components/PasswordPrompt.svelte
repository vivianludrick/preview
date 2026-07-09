<script lang="ts">
	import { LockKeyhole } from 'lucide-svelte';

	let {
		open = $bindable(false),
		error = '',
		attemptsLeft = 0,
		onsubmit,
		oncancel
	}: {
		open: boolean;
		error?: string;
		attemptsLeft?: number;
		onsubmit: (password: string) => void;
		oncancel: () => void;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let password = $state('');

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			password = '';
			dialog.showModal();
		}
		if (!open && dialog.open) dialog.close();
	});

	function submit(event: SubmitEvent) {
		event.preventDefault();
		onsubmit(password);
	}
</script>

<dialog
	bind:this={dialog}
	aria-label="Password required"
	onclose={() => {
		if (open) {
			open = false;
			oncancel();
		}
	}}
	class="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-0 text-[var(--c-fg)] shadow-2xl backdrop:bg-black/50"
>
	{#if open}
		<form onsubmit={submit} class="flex flex-col gap-4 p-5">
			<h2 class="flex items-center gap-2 text-lg font-semibold">
				<LockKeyhole size={18} aria-hidden="true" class="text-[var(--c-accent)]" />
				Password required
			</h2>
			<p class="text-sm text-[var(--c-muted)]">
				This document was encrypted by the sender. Enter the password to decrypt it locally in your
				browser.
			</p>
			<input
				type="password"
				bind:value={password}
				aria-label="Password"
				autocomplete="off"
				class="rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm focus:border-[var(--c-accent)] focus:outline-none"
			/>
			{#if error}
				<p role="alert" class="text-sm text-red-500">
					{error}{#if attemptsLeft > 0}&nbsp;({attemptsLeft}
						{attemptsLeft === 1 ? 'attempt' : 'attempts'} left){/if}
				</p>
			{/if}
			<div class="flex justify-end gap-2">
				<button
					type="button"
					onclick={() => {
						open = false;
						oncancel();
					}}
					class="rounded-lg px-3 py-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-fg)]"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-lg bg-[var(--c-accent)] px-4 py-1.5 text-sm font-medium text-[var(--c-accent-fg)] hover:opacity-90"
				>
					Unlock
				</button>
			</div>
		</form>
	{/if}
</dialog>
