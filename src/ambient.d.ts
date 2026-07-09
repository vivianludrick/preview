declare module 'markdown-it-task-lists' {
	import type MarkdownIt from 'markdown-it';
	const plugin: (md: MarkdownIt, options?: { enabled?: boolean; label?: boolean }) => void;
	export default plugin;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
	const url: string;
	export default url;
}
