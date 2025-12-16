import type { UnitOfMeasure } from './unitOfMeasure';
import { UnitOfMeasure as Units } from './unitOfMeasure';

const MILLIMETERS_PER_INCH = 25.4;

export class Measurement {
	readonly value: number;
	readonly unit: UnitOfMeasure;

	constructor(value: number, unit: UnitOfMeasure) {
		if (!Number.isFinite(value)) {
			throw new Error('Measurement value must be a finite number.');
		}
		this.value = value;
		this.unit = unit;
	}

	static parse(input: string): Measurement {
		if (!input || !input.trim()) {
			throw new Error('Measurement string cannot be empty.');
		}

		const s = input.trim();

		// Metric suffixes
		if (s.toLowerCase().endsWith('cm')) {
			const valueStr = s.slice(0, -2).trim();
			const value = Number.parseFloat(valueStr);
			if (!Number.isFinite(value)) {
				throw new Error(`Invalid centimeter measurement: '${input}'.`);
			}
			return new Measurement(value * 10, Units.Millimeters);
		}

		if (s.toLowerCase().endsWith('mm')) {
			const valueStr = s.slice(0, -2).trim();
			const value = Number.parseFloat(valueStr);
			if (!Number.isFinite(value)) {
				throw new Error(`Invalid millimeter measurement: '${input}'.`);
			}
			return new Measurement(value, Units.Millimeters);
		}

		// Imperial suffixes: in or "
		let imperialPart = s;
		if (s.toLowerCase().endsWith('in')) {
			imperialPart = s.slice(0, -2).trim();
		} else if (s.endsWith('"')) {
			imperialPart = s.slice(0, -1).trim();
		}

		const inches = tryParseImperialWithFraction(imperialPart);
		if (inches == null) {
			throw new Error(
				`Invalid measurement format: '${input}'. Expected: '8.5', '8 1/2"', '8-1/2in', '210mm', or '21cm'.`
			);
		}

		return new Measurement(inches, Units.Inches);
	}

	static tryParse(input: string): Measurement | null {
		try {
			return Measurement.parse(input);
		} catch {
			return null;
		}
	}

	toInches(): number {
		return this.unit === Units.Inches ? this.value : this.value / MILLIMETERS_PER_INCH;
	}

	toMillimeters(): number {
		return this.unit === Units.Millimeters ? this.value : this.value * MILLIMETERS_PER_INCH;
	}

	toString(): string {
		if (this.unit === Units.Inches) {
			return `${this.value.toFixed(3)}in`;
		}
		return `${this.value.toFixed(2)}mm`;
	}
}

function tryParseImperialWithFraction(s: string): number | null {
	const trimmed = s.trim();
	if (!trimmed) return null;

	// Simple decimal
	const asNumber = Number.parseFloat(trimmed);
	if (Number.isFinite(asNumber) && /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
		return asNumber;
	}

	// Fractions: "8 1/2" or "8-1/2" or "17/2"
	let whole = 0;
	let fractionPart = trimmed;

	const spaceIndex = trimmed.indexOf(' ');
	const dashIndex = trimmed.indexOf('-');
	const separatorIndex = spaceIndex >= 0 ? spaceIndex : dashIndex;

	if (separatorIndex > 0) {
		const wholePart = trimmed.slice(0, separatorIndex).trim();
		if (!/^[+-]?\d+$/.test(wholePart)) return null;
		whole = Number.parseInt(wholePart, 10);
		fractionPart = trimmed.slice(separatorIndex + 1).trim();
	}

	const slashIndex = fractionPart.indexOf('/');
	if (slashIndex <= 0) return null;

	const numeratorStr = fractionPart.slice(0, slashIndex).trim();
	const denominatorStr = fractionPart.slice(slashIndex + 1).trim();

	if (!/^[+-]?\d+$/.test(numeratorStr) || !/^[+-]?\d+$/.test(denominatorStr)) return null;

	const numerator = Number.parseInt(numeratorStr, 10);
	const denominator = Number.parseInt(denominatorStr, 10);
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;

	return whole + numerator / denominator;
}
