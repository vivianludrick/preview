import { MAX_PASSWORD_ATTEMPTS } from './codec';

/**
 * Bridges decodeShareInteractive's async password callback to a
 * PasswordPrompt dialog. One instance per previewer page.
 */
export class PromptController {
	open = $state(false);
	error = $state('');
	attemptsLeft = $state(MAX_PASSWORD_ATTEMPTS);
	#resolve: ((value: string | null) => void) | null = null;

	/** passed straight to decodeShareInteractive */
	prompt = (attempt: number, attemptsLeft: number): Promise<string | null> => {
		this.error = attempt === 1 ? '' : 'Wrong password — try again.';
		this.attemptsLeft = attemptsLeft;
		this.open = true;
		return new Promise((resolve) => (this.#resolve = resolve));
	};

	/** wire to PasswordPrompt's onsubmit */
	submit = (password: string): void => {
		this.open = false;
		this.#resolve?.(password);
		this.#resolve = null;
	};

	/** wire to PasswordPrompt's oncancel */
	cancel = (): void => {
		this.#resolve?.(null);
		this.#resolve = null;
	};
}
