import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';

const md: MarkdownIt = new MarkdownIt({
	html: true, // raw HTML allowed in, DOMPurify strips anything dangerous out
	linkify: true,
	typographer: true,
	highlight(code, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
			} catch {
				/* fall through to plain escaping */
			}
		}
		return '';
	}
}).use(taskLists, { enabled: true });

// share links mean untrusted markdown renders in the receiver's browser —
// open links in a new tab without opener access
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.tagName === 'A' && node.getAttribute('href')) {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer');
	}
});

/** markdown → sanitized HTML string, safe for {@html} */
export function renderMarkdown(source: string): string {
	return DOMPurify.sanitize(md.render(source), {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ['style', 'form'],
		ADD_ATTR: ['target']
	});
}
