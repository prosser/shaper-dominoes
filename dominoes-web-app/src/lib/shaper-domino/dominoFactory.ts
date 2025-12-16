import type { Measurement } from './measurement';
import { inches } from './measurementHelpers';
import type { PageSetup } from './pageSetup';
import { PageSetup as PageSetups } from './pageSetup';
import { Domino } from './domino';

const COLUMN_MASK = 0xff;
const CONSTANT_PIPS_MASK = 0b10000001_10000001;
const DATA_BITS_MASK = (~CONSTANT_PIPS_MASK) & 0xffff;

const REVERSE8 = createReverseTable();
const VALID_DOMINOES = buildValidDominoesList();

export class DominoFactory {
	readonly stripSpacing: Measurement;
	readonly pageSetup: PageSetup;

	constructor(stripSpacing?: Measurement, pageSetup?: PageSetup) {
		this.stripSpacing = stripSpacing ?? inches(0.125);
		this.pageSetup = pageSetup ?? PageSetups.letterPortrait(inches(0.25));
	}

	static getValidDominoes(): readonly number[] {
		return VALID_DOMINOES;
	}

	generatePagesSvg(pageCount: number): string {
		const { dominoesPerRow, dominoesPerPage } = this.calculatePageLayout();
		const totalDominoes = pageCount * dominoesPerPage;
		return this.generateSvg(totalDominoes, dominoesPerRow, true);
	}

	generateStripSvg(count: number): string {
		return this.generateSvg(count, 1, true);
	}

	private calculatePageLayout(): { dominoesPerRow: number; dominoesPerPage: number } {
		const marginInches = this.pageSetup.margin ? this.pageSetup.margin.toInches() : 0;
		const heightInches = this.pageSetup.height ? this.pageSetup.height.toInches() : Number.POSITIVE_INFINITY;
		const stripSpacingInches = this.stripSpacing.toInches();
		const printableWidth = this.pageSetup.width.toInches() - 2 * marginInches;
		const printableHeight = heightInches - 2 * marginInches;

		const dominoesPerColumn = Math.floor((printableHeight - Domino.DominoMargin) / (Domino.DominoHeight + Domino.DominoMargin));
		const dominoesPerRow = Math.floor(printableWidth / (Domino.DominoWidth + stripSpacingInches));
		const dominoesPerPage = dominoesPerColumn * dominoesPerRow;

		return { dominoesPerRow, dominoesPerPage };
	}

	private generateSvg(count: number, dominoesPerRow: number, centerOnPageX: boolean = true): string {
		const pageWidth = this.pageSetup.width.toInches();
		const stripSpacingInches = this.stripSpacing.toInches();
		const dominoValues = generateRandomUniqueDominoes(count);

		const xMargin = calculateXMargin(pageWidth, dominoesPerRow, centerOnPageX, stripSpacingInches);
		const measuredHeight = calculateTotalHeight(count, dominoesPerRow);

		let svg = '';
		svg += `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${pageWidth.toFixed(2)}in" height="${measuredHeight.toFixed(2)}in" viewBox="0 0 ${pageWidth.toFixed(2)} ${measuredHeight.toFixed(2)}">\n`;

		for (let i = 0; i < count; i++) {
			const domino = new Domino(dominoValues[i]!);
			const ix = i % dominoesPerRow;
			const iy = Math.floor(i / dominoesPerRow);
			svg += domino.toSvgShape(ix, iy, xMargin, stripSpacingInches);
		}

		svg += `</svg>\n`;
		return svg;
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

function createReverseTable(): number[] {
	const table: number[] = new Array(256);
	for (let i = 0; i < 256; i++) {
		let v = i;
		let r = 0;
		for (let b = 0; b < 8; b++) {
			r = (r << 1) | (v & 1);
			v >>= 1;
		}
		table[i] = r;
	}
	return table;
}

function popCount12(n: number): number {
	// n is 0..4095
	let x = n & 0xfff;
	let c = 0;
	while (x) {
		x &= x - 1;
		c++;
	}
	return c;
}

function buildValidDominoesList(): number[] {
	const seen = new Set<number>();
	const list: number[] = [];

	for (let dataBits = 0; dataBits < (1 << 12); dataBits++) {
		if (popCount12(dataBits) !== 6) continue;

		const col0Data = (dataBits & 0x3f) << 1;
		const col1Data = ((dataBits >> 6) & 0x3f) << 1;
		const col0 = col0Data | 0b10000001;
		const col1 = col1Data | 0b10000001;
		const value = (col0 | (col1 << 8)) & 0xffff;

		// Reject binary palindromes (col0 reversed == col1)
		if (REVERSE8[col0] === col1) continue;

		// Sanity: keep only values where constant pips are set
		if (((value & CONSTANT_PIPS_MASK) & 0xffff) !== CONSTANT_PIPS_MASK) continue;
		if (((value & DATA_BITS_MASK) & 0xffff) !== (value & DATA_BITS_MASK)) continue;

		if (!seen.has(value)) {
			seen.add(value);
			list.push(value);
		}
	}

	return list;
}

function randomInt(minInclusive: number, maxExclusive: number): number {
	const span = maxExclusive - minInclusive;
	if (span <= 0) throw new Error('Invalid randomInt range.');

	// Prefer cryptographically-strong randomness when available.
	const cryptoObj: Crypto | undefined = (globalThis as unknown as { crypto?: Crypto }).crypto;
	if (cryptoObj?.getRandomValues) {
		const buf = new Uint32Array(1);
		cryptoObj.getRandomValues(buf);
		return minInclusive + (buf[0]! % span);
	}

	return minInclusive + Math.floor(Math.random() * span);
}

function generateRandomUniqueDominoes(count: number): number[] {
	const available = VALID_DOMINOES.slice();
	if (count > available.length) {
		throw new Error(`Requested ${count} unique dominoes, but only ${available.length} valid dominoes exist.`);
	}

	const result: number[] = new Array(count);
	for (let i = 0; i < count; i++) {
		const randomIndex = randomInt(i, available.length);
		result[i] = available[randomIndex]!;
		available[randomIndex] = available[i]!;
	}
	return result;
}
