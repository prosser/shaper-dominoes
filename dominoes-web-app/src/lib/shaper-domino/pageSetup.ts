import type { Measurement } from './measurement';
import { inches, millimeters } from './measurementHelpers';

export type PageSetup = {
	width: Measurement;
	height?: Measurement;
	margin?: Measurement;
};

export const PageSetup = {
	letterPortrait: (margin?: Measurement): PageSetup => ({
		width: inches(8.5),
		height: inches(11),
		margin: margin ?? inches(0.25)
	}),
	legalPortrait: (margin?: Measurement): PageSetup => ({
		width: inches(8.5),
		height: inches(14),
		margin: margin ?? inches(0.25)
	}),
	letterLandscape: (margin?: Measurement): PageSetup => ({
		width: inches(11),
		height: inches(8.5),
		margin: margin ?? inches(0.25)
	}),
	A4Portrait: (margin?: Measurement): PageSetup => ({
		width: millimeters(210),
		height: millimeters(297),
		margin: margin ?? millimeters(10)
	}),
	A3Portrait: (margin?: Measurement): PageSetup => ({
		width: millimeters(297),
		height: millimeters(420),
		margin: margin ?? millimeters(10)
	}),
	A4Landscape: (margin?: Measurement): PageSetup => ({
		width: millimeters(297),
		height: millimeters(210),
		margin: margin ?? millimeters(10)
	}),
	continuousLabel: (width: Measurement, margin?: Measurement): PageSetup => ({
		width,
		height: undefined,
		margin: margin ?? inches(0.125)
	})
};
