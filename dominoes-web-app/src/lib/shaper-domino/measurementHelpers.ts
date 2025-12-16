import { Measurement } from './measurement';
import { UnitOfMeasure } from './unitOfMeasure';

export function inches(value: number): Measurement {
	return new Measurement(value, UnitOfMeasure.Inches);
}

export function millimeters(value: number): Measurement {
	return new Measurement(value, UnitOfMeasure.Millimeters);
}

export function centimeters(value: number): Measurement {
	return new Measurement(value * 10, UnitOfMeasure.Millimeters);
}
