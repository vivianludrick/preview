/** The blob is not a valid share payload (bad base64url, bad envelope, bad deflate). */
export class MalformedBlobError extends Error {
	constructor(message = 'This share link is corrupted or invalid.') {
		super(message);
		this.name = 'MalformedBlobError';
	}
}

/** The envelope is encrypted and no password was supplied. */
export class PasswordRequiredError extends Error {
	constructor() {
		super('This share link is password-protected.');
		this.name = 'PasswordRequiredError';
	}
}

/** AES-GCM authentication failed — wrong password (or tampered ciphertext). */
export class WrongPasswordError extends Error {
	constructor(message = 'Wrong password.') {
		super(message);
		this.name = 'WrongPasswordError';
	}
}

/** Every shortening provider failed or refused the URL. */
export class ShortenFailedError extends Error {
	constructor(message = 'Could not shorten the link.') {
		super(message);
		this.name = 'ShortenFailedError';
	}
}
