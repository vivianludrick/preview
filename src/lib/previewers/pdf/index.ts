import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
// bundled by Vite as a local asset — never a CDN worker
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy };

/** pdf.js transfers the buffer it is given — callers should pass a copy. */
export function loadPdf(data: Uint8Array): Promise<PDFDocumentProxy> {
	return pdfjs.getDocument({ data }).promise;
}

/** Render one page into a canvas at a CSS width, honoring devicePixelRatio. */
export async function renderPage(
	pdf: PDFDocumentProxy,
	pageNumber: number,
	canvas: HTMLCanvasElement,
	cssWidth: number
): Promise<{ cssHeight: number }> {
	const page = await pdf.getPage(pageNumber);
	const unscaled = page.getViewport({ scale: 1 });
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const viewport = page.getViewport({ scale: (cssWidth / unscaled.width) * dpr });
	canvas.width = Math.floor(viewport.width);
	canvas.height = Math.floor(viewport.height);
	const cssHeight = cssWidth * (unscaled.height / unscaled.width);
	canvas.style.width = `${cssWidth}px`;
	canvas.style.height = `${cssHeight}px`;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('canvas 2d context unavailable');
	await page.render({ canvasContext: context, viewport }).promise;
	return { cssHeight };
}
