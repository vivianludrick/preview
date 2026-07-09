import { html } from '@codemirror/lang-html';
import { createBaseEditor, setEditorContent, type EditorView } from '$lib/editor/base';

export { setEditorContent };
export type { EditorView };

export function createEditor(
	parent: HTMLElement,
	doc: string,
	onChange: (value: string) => void
): EditorView {
	return createBaseEditor(parent, doc, onChange, [html()]);
}
