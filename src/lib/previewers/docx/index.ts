import mammoth from 'mammoth/mammoth.browser';
import DOMPurify from 'dompurify';

/** DOCX bytes → sanitized HTML (mammoth maps Word styles to semantic tags) */
export async function renderDocx(bytes: Uint8Array): Promise<string> {
	const copy = bytes.slice(); // own the buffer — callers keep theirs for sharing
	const result = await mammoth.convertToHtml({ arrayBuffer: copy.buffer as ArrayBuffer });
	return DOMPurify.sanitize(result.value, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ['style', 'form']
	});
}
