export interface TextRun {
	text: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	/** px */
	size: number;
	color: string | null;
}

export interface Paragraph {
	runs: TextRun[];
	align: 'left' | 'center' | 'right' | 'justify';
	level: number;
	bullet: boolean;
}

export interface SlideElement {
	type: 'text' | 'image';
	/** px, slide coordinate space */
	x: number;
	y: number;
	w: number;
	h: number;
	paragraphs: Paragraph[];
	/** blob URL for images */
	src: string | null;
	fill: string | null;
	anchor: 'top' | 'middle' | 'bottom';
}

export interface Slide {
	elements: SlideElement[];
	background: string | null;
}

export interface Deck {
	/** px */
	width: number;
	height: number;
	slides: Slide[];
	textColor: string;
}
