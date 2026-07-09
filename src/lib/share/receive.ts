/**
 * Shared receive flow for `?data=` links — every previewer page funnels
 * through this instead of hand-rolling the decode/cancel/error branches.
 *
 * The codec (fflate + WebCrypto) is imported dynamically so pages that never
 * receive a share link don't pay for it.
 */
export type ReceiveResult =
	| { status: 'none' }
	| { status: 'ok'; bytes: Uint8Array }
	| { status: 'cancelled' }
	| { status: 'error'; message: string };

export async function receiveShared(
	dataParam: string | null,
	promptPassword: (attempt: number, attemptsLeft: number) => Promise<string | null>
): Promise<ReceiveResult> {
	if (!dataParam) return { status: 'none' };
	try {
		const codec = await import('./codec');
		const bytes = await codec.decodeShareInteractive(dataParam, promptPassword);
		if (bytes === null) return { status: 'cancelled' };
		return { status: 'ok', bytes };
	} catch (e) {
		return {
			status: 'error',
			message: e instanceof Error ? e.message : 'Could not open this share link.'
		};
	}
}
