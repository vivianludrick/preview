declare module 'markdown-it-task-lists' {
	import type MarkdownIt from 'markdown-it';
	const plugin: (md: MarkdownIt, options?: { enabled?: boolean; label?: boolean }) => void;
	export default plugin;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
	const url: string;
	export default url;
}

declare module 'mammoth/mammoth.browser' {
	const mammoth: {
		convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{
			value: string;
			messages: unknown[];
		}>;
	};
	export default mammoth;
}
