/**
 * Previewer registry — one entry per supported file type.
 * The homepage search and the header derive everything from this list,
 * so adding a future previewer is: new route + new previewers/<type>/ + one entry here.
 */
export interface PreviewerInfo {
	ext: string;
	name: string;
	description: string;
	keywords: string[];
	upload: boolean;
}

export const registry: PreviewerInfo[] = [
	{
		ext: 'md',
		name: 'Markdown',
		description: 'Live editor with GitHub-flavored rendering, code highlighting and task lists.',
		keywords: ['markdown', 'md', 'text', 'readme', 'gfm'],
		upload: false
	},
	{
		ext: 'pdf',
		name: 'PDF',
		description: 'Render PDF documents page by page, entirely in your browser.',
		keywords: ['pdf', 'document', 'acrobat'],
		upload: true
	},
	{
		ext: 'ppt',
		name: 'PowerPoint',
		description: 'View PPTX slides with navigation arrows and a thumbnail filmstrip.',
		keywords: ['ppt', 'pptx', 'powerpoint', 'slides', 'presentation', 'deck'],
		upload: true
	},
	{
		ext: 'csv',
		name: 'CSV',
		description: 'Edit comma/tab-separated text and preview it as a clean table.',
		keywords: ['csv', 'tsv', 'table', 'spreadsheet', 'data', 'comma'],
		upload: false
	},
	{
		ext: 'html',
		name: 'HTML',
		description: 'Write HTML and see it live in a sandboxed frame — scripts included.',
		keywords: ['html', 'web', 'page', 'iframe', 'css', 'javascript'],
		upload: false
	},
	{
		ext: 'docx',
		name: 'Word',
		description: 'Read DOCX documents converted to clean HTML, entirely in your browser.',
		keywords: ['docx', 'word', 'document', 'doc', 'office'],
		upload: true
	},
	{
		ext: 'xlsx',
		name: 'Excel',
		description: 'Browse XLSX workbooks sheet by sheet as tables.',
		keywords: ['xlsx', 'xls', 'excel', 'spreadsheet', 'workbook', 'sheets'],
		upload: true
	}
];
