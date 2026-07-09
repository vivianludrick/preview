import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export type { EditorView };

// colors come from the theme's CSS variables, so the editor restyles
// automatically when the app theme changes
const highlight = HighlightStyle.define([
	{ tag: tags.heading, color: 'var(--c-syn-heading)', fontWeight: 'bold' },
	{ tag: tags.strong, fontWeight: 'bold' },
	{ tag: tags.emphasis, fontStyle: 'italic', color: 'var(--c-syn-emphasis)' },
	{ tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--c-muted)' },
	{ tag: tags.link, color: 'var(--c-syn-link)' },
	{ tag: tags.url, color: 'var(--c-syn-link)', textDecoration: 'underline' },
	{ tag: tags.monospace, color: 'var(--c-syn-string)' },
	{ tag: tags.quote, color: 'var(--c-syn-comment)', fontStyle: 'italic' },
	{ tag: tags.keyword, color: 'var(--c-syn-keyword)' },
	{ tag: tags.string, color: 'var(--c-syn-string)' },
	{ tag: tags.comment, color: 'var(--c-syn-comment)' },
	{ tag: tags.number, color: 'var(--c-syn-number)' },
	{ tag: [tags.function(tags.variableName), tags.labelName], color: 'var(--c-syn-function)' },
	{ tag: [tags.tagName, tags.angleBracket], color: 'var(--c-syn-keyword)' },
	{ tag: tags.attributeName, color: 'var(--c-syn-number)' },
	{ tag: tags.attributeValue, color: 'var(--c-syn-string)' },
	{ tag: tags.meta, color: 'var(--c-muted)' },
	{ tag: tags.processingInstruction, color: 'var(--c-muted)' },
	{ tag: tags.contentSeparator, color: 'var(--c-syn-comment)' }
]);

const theme = EditorView.theme({
	'&': {
		height: '100%',
		backgroundColor: 'var(--c-bg)',
		color: 'var(--c-fg)',
		fontSize: '14px'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
		// integer pixel value on purpose: a fractional line height (1.6 × 14px
		// = 22.4px) puts cursor/selection layers on subpixel boundaries, which
		// makes drawSelection jitter when selecting or moving the cursor
		lineHeight: '22px',
		overflow: 'auto'
	},
	'.cm-content': { padding: '12px 0', caretColor: 'var(--c-fg)' },
	'.cm-line': { padding: '0 12px' },
	'.cm-gutters': {
		backgroundColor: 'var(--c-surface)',
		color: 'var(--c-muted)',
		border: 'none',
		borderRight: '1px solid var(--c-border)'
	},
	'.cm-activeLine': { backgroundColor: 'transparent' },
	'.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--c-fg)' },
	'.cm-cursor': { borderLeftColor: 'var(--c-fg)' },
	'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground':
		{ backgroundColor: 'var(--c-selection) !important' }
});

export function createBaseEditor(
	parent: HTMLElement,
	doc: string,
	onChange: (value: string) => void,
	language: Extension[] = []
): EditorView {
	return new EditorView({
		parent,
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				history(),
				drawSelection(),
				highlightActiveLine(),
				bracketMatching(),
				...language,
				syntaxHighlighting(highlight),
				theme,
				EditorView.lineWrapping,
				keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) onChange(update.state.doc.toString());
				})
			]
		})
	});
}

/** replace the whole document (used when share-link content arrives) */
export function setEditorContent(view: EditorView, content: string): void {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: content }
	});
}
