import { Domino } from './domino';
import { DominoFactory } from './dominoFactory';
import { inches } from './measurementHelpers';
import { PageSetup } from './pageSetup';

type JsPdfDoc = {
	setFillColor: (...args: unknown[]) => unknown;
	setDrawColor: (...args: unknown[]) => unknown;
	roundedRect: (x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string) => unknown;
	circle: (x: number, y: number, r: number, style?: string) => unknown;
	addPage: () => unknown;
	output: (type: 'blob') => Blob;
};

function getJsPdf(): { jsPDF: new (options?: unknown) => JsPdfDoc } {
	if (typeof window === 'undefined') {
		throw new Error('PDF generation is only available in the browser.');
	}

	const jspdf = window.jspdf;
	if (!jspdf?.jsPDF) {
		throw new Error('jsPDF is not available. Check the CDN script tag in src/app.html.');
	}

	return jspdf;
}

export async function generateSingleLetterPagePdfBlob(): Promise<Blob> {
	return generateLetterPagesPdfBlob(1);
}

export type DesktopPaperSize = 'letter' | 'legal' | 'a4' | 'a3';

function getDesktopPageSetup(paper: DesktopPaperSize): { setup: ReturnType<(typeof PageSetup)[keyof typeof PageSetup]>; widthIn: number; heightIn: number } {
	const setup =
		paper === 'legal'
			? PageSetup.legalPortrait(inches(0.25))
			: paper === 'a4'
				? PageSetup.A4Portrait()
				: paper === 'a3'
					? PageSetup.A3Portrait()
					: PageSetup.letterPortrait(inches(0.25));

	const widthIn = setup.width.toInches();
	const heightIn = (setup.height ?? setup.width).toInches();
	return { setup, widthIn, heightIn };
}

export async function generateLetterPagesPdfBlob(
	pageCount: number,
	stripSpacingInches: number = 1,
	paper: DesktopPaperSize = 'letter'
): Promise<Blob> {
	const { jsPDF } = getJsPdf();

	if (!Number.isFinite(pageCount) || pageCount < 1) {
		throw new Error('Page count must be at least 1.');
	}

	pageCount = Math.floor(pageCount);

	if (!Number.isFinite(stripSpacingInches) || stripSpacingInches <= 0) {
		throw new Error('Row spacing must be a positive number.');
	}

	stripSpacingInches = stripSpacingInches;

	const { setup: pageSetup, widthIn: pageWidthIn, heightIn: pageHeightIn } = getDesktopPageSetup(paper);

	// User-selected strip/row spacing + selected paper size
	const factory = new DominoFactory(inches(stripSpacingInches), pageSetup);
	const valid = DominoFactory.getValidDominoes();

	const marginIn = pageSetup.margin ? pageSetup.margin.toInches() : 0;
	const stripSpacingIn = factory.stripSpacing.toInches();

	const printableWidth = pageWidthIn - 2 * marginIn;
	const printableHeight = pageHeightIn - 2 * marginIn;

	const dominoesPerColumn = Math.floor((printableHeight - Domino.DominoMargin) / (Domino.DominoHeight + Domino.DominoMargin));
	const dominoesPerRow = Math.floor(printableWidth / (Domino.DominoWidth + stripSpacingIn));
	const dominoesPerPage = dominoesPerColumn * dominoesPerRow;
	const totalDominoes = pageCount * dominoesPerPage;

	// Center columns across the page, like the C# renderer
	const xMargin = calculateXMargin(pageWidthIn, dominoesPerRow, true, stripSpacingIn);

	// Pick dominoes (unique until the list is exhausted, then repeats)
	const values = pickRandomDominoes(valid, totalDominoes);

	const doc = new jsPDF({ unit: 'in', format: [pageWidthIn, pageHeightIn], orientation: 'portrait' });

	for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
		if (pageIndex > 0) {
			doc.addPage();
		}

		const pageStart = pageIndex * dominoesPerPage;
		for (let i = 0; i < dominoesPerPage; i++) {
			const v = values[pageStart + i]!;
			const ix = i % dominoesPerRow;
			const iy = Math.floor(i / dominoesPerRow);

			const x = ix * (Domino.DominoWidth + stripSpacingIn) + xMargin;
			const y = iy * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;

			doc.setDrawColor(0, 0, 0);
			doc.setFillColor(0, 0, 0);
			doc.roundedRect(x, y, Domino.DominoWidth, Domino.DominoHeight, 0.1, 0.1, 'F');
			renderPips(doc, v, x, y);
		}
	}

	return doc.output('blob');
}

export type LabelLayout = 'strip' | 'rows';

export async function generateBrotherLabelPdfBlob(options?: {
	labelWidthInches?: number;
	labelLengthInches?: number;
	layout?: LabelLayout;
}): Promise<Blob> {
	const { jsPDF } = getJsPdf();

	const labelWidthInches = options?.labelWidthInches ?? 2.4;
	const labelLengthInches = options?.labelLengthInches ?? 36;
	const layout: LabelLayout = options?.layout ?? 'strip';

	if (!Number.isFinite(labelWidthInches) || labelWidthInches < 0.75) {
		throw new Error('Label width must be at least 0.75".');
	}
	if (!Number.isFinite(labelLengthInches) || labelLengthInches < 2 || labelLengthInches > 36) {
		throw new Error('Label length must be between 2" and 36".');
	}

	const lengthIn = labelLengthInches;

	// Continuous label: width is user-chosen, height grows to fit content.
	const factory = new DominoFactory(undefined, PageSetup.continuousLabel(inches(labelWidthInches)));
	const stripSpacingIn = factory.stripSpacing.toInches();
	const valid = DominoFactory.getValidDominoes();

	const dominoesPerRow =
		layout === 'strip'
			? 1
			: Math.max(1, Math.floor(labelWidthInches / (Domino.DominoWidth + stripSpacingIn)));

	const dominoesPerColumn = Math.max(
		1,
		Math.floor((lengthIn - Domino.DominoMargin) / (Domino.DominoHeight + Domino.DominoMargin))
	);
	const totalDominoes = dominoesPerRow * dominoesPerColumn;

	const xMargin = calculateXMargin(labelWidthInches, dominoesPerRow, true, stripSpacingIn);
	const values = pickRandomDominoes(valid, totalDominoes);

	// Fixed-length label PDF: [width, length] in inches
	const doc = new jsPDF({ unit: 'in', format: [labelWidthInches, lengthIn], orientation: 'portrait' });

	for (let i = 0; i < values.length; i++) {
		const v = values[i]!;
		const ix = i % dominoesPerRow;
		const iy = Math.floor(i / dominoesPerRow);

		const x = ix * (Domino.DominoWidth + stripSpacingIn) + xMargin;
		const y = iy * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;

		doc.setDrawColor(0, 0, 0);
		doc.setFillColor(0, 0, 0);
		doc.roundedRect(x, y, Domino.DominoWidth, Domino.DominoHeight, 0.1, 0.1, 'F');
		renderPips(doc, v, x, y);
	}

	return doc.output('blob');
}

function renderPips(doc: Pick<JsPdfDoc, 'setFillColor' | 'circle'>, value: number, x: number, y: number): void {
	// Keep constants in sync with domino.ts
	const pipsPerColumn = 8;
	const columnsPerDomino = 2;
	const pipMargin = 0.1;
	const pipDiameter = 0.1;
	const pipRadius = pipDiameter / 2;
	const pipOffsetSpacing = pipDiameter + pipMargin;

	doc.setFillColor(255, 255, 255);

	for (let column = 0; column < columnsPerDomino; column++) {
		let mask = 1 << (column * pipsPerColumn);
		const cx = x + pipMargin + pipRadius + column * pipOffsetSpacing;
		for (let pip = 0; pip < pipsPerColumn; pip++, mask <<= 1) {
			if ((value & mask) !== 0) {
				const cy = y + pipMargin + pipRadius + pip * pipOffsetSpacing;
				doc.circle(cx, cy, pipRadius, 'F');
			}
		}
	}
}

function calculateTotalHeight(count: number, dominoesPerRow: number): number {
	return Math.ceil(count / dominoesPerRow) * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;
}

function calculateXMargin(pageWidth: number, dominoesPerRow: number, centerOnPageX: boolean, stripSpacing: number): number {
	if (!centerOnPageX) return stripSpacing;
	const usedWidth = dominoesPerRow * Domino.DominoWidth + (dominoesPerRow + 1) * stripSpacing;
	const remainingWidth = pageWidth - usedWidth;
	return stripSpacing + remainingWidth / 2;
}

function pickRandomDominoes(source: readonly number[], count: number): number[] {
	if (source.length === 0) {
		throw new Error('No valid dominoes available.');
	}
	if (count <= 0) return [];

	const result: number[] = [];
	let remaining = count;

	while (remaining > 0) {
		const take = Math.min(remaining, source.length);
		const available = source.slice();

		for (let i = 0; i < take; i++) {
			const j = i + Math.floor(Math.random() * (available.length - i));
			result.push(available[j]!);
			available[j] = available[i]!;
		}

		remaining -= take;
	}

	return result;
}
