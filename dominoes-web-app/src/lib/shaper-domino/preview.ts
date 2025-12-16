import { Domino } from './domino';
import { DominoFactory } from './dominoFactory';
import { inches } from './measurementHelpers';
import { PageSetup } from './pageSetup';
import type { DesktopPaperSize, LabelLayout } from './pdf';

export function generateDesktopPreviewSvg(options?: { rowSpacingInches?: number; paper?: DesktopPaperSize }): string {
	const rowSpacingInches = options?.rowSpacingInches ?? 1;
	const paper: DesktopPaperSize = options?.paper ?? 'letter';
	if (!Number.isFinite(rowSpacingInches) || rowSpacingInches <= 0) {
		throw new Error('Row spacing must be a positive number.');
	}

	const pageSetup =
		paper === 'legal'
			? PageSetup.legalPortrait(inches(0.25))
			: paper === 'a4'
				? PageSetup.A4Portrait()
				: paper === 'a3'
					? PageSetup.A3Portrait()
					: PageSetup.letterPortrait(inches(0.25));

	const factory = new DominoFactory(inches(rowSpacingInches), pageSetup);
	return factory.generatePagesSvg(1);
}

export function generateLabelPreviewSvg(options?: {
	labelWidthInches?: number;
	layout?: LabelLayout;
}): string {
	const labelWidthInches = options?.labelWidthInches ?? 2.4;
	const layout: LabelLayout = options?.layout ?? 'strip';

	if (!Number.isFinite(labelWidthInches) || labelWidthInches < 0.75) {
		throw new Error('Label width must be at least 0.75".');
	}

	// One-row preview only:
	// - strip mode => 1 domino
	// - rows mode  => as many dominoes as fit across the width
	const stripSpacingIn = 0.125;
	const dominoesPerRow =
		layout === 'strip'
			? 1
			: Math.max(1, Math.floor(labelWidthInches / (Domino.DominoWidth + stripSpacingIn)));

	const count = dominoesPerRow;
	const xMargin = calculateXMargin(labelWidthInches, dominoesPerRow, true, stripSpacingIn);
	const heightIn = calculateTotalHeight(count, dominoesPerRow);

	const values = pickRandomDominoes(DominoFactory.getValidDominoes(), count);

	let svg = '';
	svg += `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${labelWidthInches.toFixed(2)}in" height="${heightIn.toFixed(2)}in" viewBox="0 0 ${labelWidthInches.toFixed(2)} ${heightIn.toFixed(2)}">\n`;

	for (let i = 0; i < values.length; i++) {
		const domino = new Domino(values[i]!);
		const ix = i;
		const iy = 0;
		svg += domino.toSvgShape(ix, iy, xMargin, stripSpacingIn);
	}

	svg += `</svg>\n`;
	return svg;
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
