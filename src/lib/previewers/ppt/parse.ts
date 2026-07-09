import JSZip from 'jszip';
import type { Deck, Slide, SlideElement, Paragraph, TextRun } from './types';

/*
 * Minimal PPTX renderer data extraction: text boxes, images, solid fills and
 * backgrounds. Complex features (SmartArt, charts, animations, groups) degrade
 * gracefully by being skipped — accepted-fidelity approach per the PRD.
 */

const EMU_PER_PX = 9525;

const MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	bmp: 'image/bmp',
	svg: 'image/svg+xml',
	webp: 'image/webp',
	tiff: 'image/tiff',
	emf: 'image/emf',
	wmf: 'image/wmf'
};

function children(parent: Element, local: string): Element[] {
	return Array.from(parent.children).filter((c) => c.localName === local);
}

function descend(parent: Element | Document, ...path: string[]): Element | null {
	let current: Element | null;
	let start = 0;
	if (parent instanceof Document) {
		// for documents the first path segment names the root element itself
		current = parent.documentElement;
		if (!current || current.localName !== path[0]) return null;
		start = 1;
	} else {
		current = parent;
	}
	for (let i = start; i < path.length; i++) {
		if (!current) return null;
		current = Array.from(current.children).find((c) => c.localName === path[i]) ?? null;
	}
	return current;
}

function attr(el: Element | null, name: string): string | null {
	if (!el) return null;
	// namespace-agnostic: r:id / r:embed arrive with varying prefixes
	for (const a of Array.from(el.attributes)) {
		if (a.localName === name) return a.value;
	}
	return null;
}

function parseXml(text: string): Document {
	return new DOMParser().parseFromString(text, 'application/xml');
}

async function readXml(zip: JSZip, path: string): Promise<Document | null> {
	const file = zip.file(path);
	if (!file) return null;
	return parseXml(await file.async('text'));
}

/** rels file → map of rId → resolved zip path */
async function readRels(zip: JSZip, relsPath: string, baseDir: string): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	const doc = await readXml(zip, relsPath);
	if (!doc) return map;
	for (const rel of Array.from(doc.getElementsByTagName('Relationship'))) {
		const id = rel.getAttribute('Id');
		let target = rel.getAttribute('Target');
		if (!id || !target) continue;
		if (target.startsWith('/')) {
			target = target.slice(1);
		} else {
			// resolve ../ against the rels owner's directory
			const parts = `${baseDir}/${target}`.split('/');
			const resolved: string[] = [];
			for (const part of parts) {
				if (part === '..') resolved.pop();
				else if (part !== '.' && part !== '') resolved.push(part);
			}
			target = resolved.join('/');
		}
		map.set(id, target);
	}
	return map;
}

type ColorScheme = Map<string, string>;

async function readColorScheme(zip: JSZip): Promise<ColorScheme> {
	const scheme: ColorScheme = new Map();
	const themeFile = Object.keys(zip.files).find((p) => /^ppt\/theme\/theme\d*\.xml$/.test(p));
	if (!themeFile) return scheme;
	const doc = await readXml(zip, themeFile);
	const clrScheme = doc ? descend(doc, 'theme', 'themeElements', 'clrScheme') : null;
	if (!clrScheme) return scheme;
	for (const entry of Array.from(clrScheme.children)) {
		const srgb = children(entry, 'srgbClr')[0];
		const sys = children(entry, 'sysClr')[0];
		const value = srgb?.getAttribute('val') ?? sys?.getAttribute('lastClr');
		if (value) scheme.set(entry.localName, `#${value}`);
	}
	return scheme;
}

const SCHEME_ALIASES: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };

/** resolve a solidFill-style parent element to a CSS color, or null */
function resolveColor(parent: Element | null, scheme: ColorScheme): string | null {
	if (!parent) return null;
	const srgb = parent.getElementsByTagName('a:srgbClr')[0] ?? findLocal(parent, 'srgbClr');
	if (srgb) {
		const val = srgb.getAttribute('val');
		if (val) return `#${val}`;
	}
	const schemeClr = findLocal(parent, 'schemeClr');
	if (schemeClr) {
		const name = schemeClr.getAttribute('val');
		if (name) return scheme.get(SCHEME_ALIASES[name] ?? name) ?? null;
	}
	return null;
}

function findLocal(parent: Element, local: string): Element | null {
	const walk = (el: Element): Element | null => {
		for (const child of Array.from(el.children)) {
			if (child.localName === local) return child;
			const found = walk(child);
			if (found) return found;
		}
		return null;
	};
	return walk(parent);
}

function parseParagraph(p: Element, scheme: ColorScheme): Paragraph {
	const pPr = children(p, 'pPr')[0] ?? null;
	const algnMap: Record<string, Paragraph['align']> = {
		l: 'left',
		ctr: 'center',
		r: 'right',
		just: 'justify'
	};
	const align = algnMap[pPr?.getAttribute('algn') ?? 'l'] ?? 'left';
	const level = Number(pPr?.getAttribute('lvl') ?? '0');
	const bullet = pPr ? children(pPr, 'buChar').length > 0 || children(pPr, 'buAutoNum').length > 0 : false;

	const runs: TextRun[] = [];
	for (const node of Array.from(p.children)) {
		if (node.localName === 'r') {
			const rPr = children(node, 'rPr')[0] ?? null;
			const solidFill = rPr ? children(rPr, 'solidFill')[0] : null;
			const sz = Number(rPr?.getAttribute('sz') ?? '1800');
			runs.push({
				text: children(node, 't')[0]?.textContent ?? '',
				bold: rPr?.getAttribute('b') === '1',
				italic: rPr?.getAttribute('i') === '1',
				underline: (rPr?.getAttribute('u') ?? 'none') !== 'none',
				size: ((sz / 100) * 4) / 3, // centipoints → pt → px
				color: solidFill ? resolveColor(solidFill, scheme) : null
			});
		} else if (node.localName === 'br') {
			runs.push({ text: '\n', bold: false, italic: false, underline: false, size: 24, color: null });
		}
	}
	return { runs, align, level, bullet };
}

function parseTransform(sp: Element): { x: number; y: number; w: number; h: number } | null {
	const xfrm = findLocal(sp, 'xfrm');
	if (!xfrm) return null;
	const off = children(xfrm, 'off')[0];
	const ext = children(xfrm, 'ext')[0];
	if (!off || !ext) return null;
	return {
		x: Number(off.getAttribute('x') ?? 0) / EMU_PER_PX,
		y: Number(off.getAttribute('y') ?? 0) / EMU_PER_PX,
		w: Number(ext.getAttribute('cx') ?? 0) / EMU_PER_PX,
		h: Number(ext.getAttribute('cy') ?? 0) / EMU_PER_PX
	};
}

async function parseSlide(
	zip: JSZip,
	slidePath: string,
	scheme: ColorScheme
): Promise<Slide> {
	const doc = await readXml(zip, slidePath);
	const slide: Slide = { elements: [], background: null };
	if (!doc) return slide;

	const relsPath = slidePath.replace(/slides\/([^/]+)$/, 'slides/_rels/$1.rels');
	const rels = await readRels(zip, relsPath, 'ppt/slides');

	const cSld = descend(doc, 'sld', 'cSld');
	if (!cSld) return slide;

	const bgPr = descend(cSld, 'bg', 'bgPr');
	if (bgPr) {
		const solidFill = children(bgPr, 'solidFill')[0] ?? null;
		slide.background = resolveColor(solidFill, scheme);
	}

	const spTree = children(cSld, 'spTree')[0];
	if (!spTree) return slide;

	for (const node of Array.from(spTree.children)) {
		if (node.localName === 'sp') {
			const box = parseTransform(node);
			if (!box || box.w <= 0 || box.h <= 0) continue;
			const spPr = children(node, 'spPr')[0] ?? null;
			const fill = spPr ? resolveColor(children(spPr, 'solidFill')[0] ?? null, scheme) : null;
			const txBody = children(node, 'txBody')[0] ?? null;
			const paragraphs = txBody
				? children(txBody, 'p').map((p) => parseParagraph(p, scheme))
				: [];
			const bodyPr = txBody ? children(txBody, 'bodyPr')[0] : null;
			const anchorMap: Record<string, SlideElement['anchor']> = { t: 'top', ctr: 'middle', b: 'bottom' };
			slide.elements.push({
				type: 'text',
				...box,
				paragraphs,
				src: null,
				fill,
				anchor: anchorMap[bodyPr?.getAttribute('anchor') ?? 't'] ?? 'top'
			});
		} else if (node.localName === 'pic') {
			const box = parseTransform(node);
			if (!box || box.w <= 0 || box.h <= 0) continue;
			const blip = findLocal(node, 'blip');
			const embedId = attr(blip, 'embed');
			const mediaPath = embedId ? rels.get(embedId) : undefined;
			const mediaFile = mediaPath ? zip.file(mediaPath) : null;
			if (!mediaFile) continue;
			const ext = mediaPath!.split('.').pop()?.toLowerCase() ?? '';
			const bytes = await mediaFile.async('arraybuffer');
			const url = URL.createObjectURL(new Blob([bytes], { type: MIME[ext] ?? 'application/octet-stream' }));
			slide.elements.push({
				type: 'image',
				...box,
				paragraphs: [],
				src: url,
				fill: null,
				anchor: 'top'
			});
		}
		// other node kinds (groups, graphicFrames, …) are skipped: graceful degradation
	}
	return slide;
}

export async function parsePptx(data: Uint8Array): Promise<Deck> {
	const zip = await JSZip.loadAsync(data.slice());

	const presentation = await readXml(zip, 'ppt/presentation.xml');
	if (!presentation) throw new Error('not a PPTX file (missing ppt/presentation.xml)');

	const sldSz = descend(presentation, 'presentation', 'sldSz');
	const width = Number(sldSz?.getAttribute('cx') ?? 12192000) / EMU_PER_PX;
	const height = Number(sldSz?.getAttribute('cy') ?? 6858000) / EMU_PER_PX;

	const rels = await readRels(zip, 'ppt/_rels/presentation.xml.rels', 'ppt');
	const scheme = await readColorScheme(zip);

	const sldIdLst = descend(presentation, 'presentation', 'sldIdLst');
	const slidePaths: string[] = [];
	if (sldIdLst) {
		for (const sldId of children(sldIdLst, 'sldId')) {
			const rId = attr(sldId, 'id');
			const target = rId ? rels.get(rId) : undefined;
			if (target) slidePaths.push(target);
		}
	}
	if (slidePaths.length === 0) {
		// fall back to natural ordering if the id list is unusable
		slidePaths.push(
			...Object.keys(zip.files)
				.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
				.sort((a, b) => Number(a.match(/\d+/g)?.pop()) - Number(b.match(/\d+/g)?.pop()))
		);
	}
	if (slidePaths.length === 0) throw new Error('presentation has no slides');

	const slides: Slide[] = [];
	for (const path of slidePaths) {
		slides.push(await parseSlide(zip, path, scheme));
	}

	return { width, height, slides, textColor: scheme.get('dk1') ?? '#111111' };
}

/** release image blob URLs when a deck is replaced */
export function disposeDeck(deck: Deck): void {
	for (const slide of deck.slides) {
		for (const el of slide.elements) {
			if (el.src) URL.revokeObjectURL(el.src);
		}
	}
}
