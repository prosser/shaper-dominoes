export class Domino {
	static readonly DominoMargin = 0.125; // inches
	private static readonly PIPS_PER_COLUMN = 8;
	private static readonly COLUMNS_PER_DOMINO = 2;

	private static readonly PIP_MARGIN = 0.1;
	private static readonly PIP_DIAMETER = 0.1;
	private static readonly PIP_RADIUS = Domino.PIP_DIAMETER / 2;

	private static readonly CORNER_RADIUS = 0.1;
	private static readonly PIP_OFFSET_SPACING = Domino.PIP_DIAMETER + Domino.PIP_MARGIN;

	static readonly DominoHeight = Domino.PIP_DIAMETER * Domino.PIPS_PER_COLUMN + Domino.PIP_MARGIN * (Domino.PIPS_PER_COLUMN + 1);
	static readonly DominoWidth = Domino.PIP_DIAMETER * Domino.COLUMNS_PER_DOMINO + Domino.PIP_MARGIN * (Domino.COLUMNS_PER_DOMINO + 1);

	readonly value: number;

	constructor(value: number) {
		this.value = value & 0xffff;
	}

	toSvgShape(dxOffset: number, dyOffset: number, xMargin: number = Domino.DominoMargin, stripSpacing: number = Domino.DominoMargin): string {
		const x = dxOffset * (Domino.DominoWidth + stripSpacing) + xMargin;
		const y = dyOffset * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;

		let out = '';
		out += `<rect x="${x.toFixed(4)}" y="${y.toFixed(4)}" width="${Domino.DominoWidth.toFixed(4)}" height="${Domino.DominoHeight.toFixed(4)}" rx="${Domino.CORNER_RADIUS.toFixed(4)}" ry="${Domino.CORNER_RADIUS.toFixed(4)}" fill="black" />\n`;

		for (let column = 0; column < Domino.COLUMNS_PER_DOMINO; column++) {
			let mask = 1 << (column * Domino.PIPS_PER_COLUMN);
			const cx = x + Domino.PIP_MARGIN + Domino.PIP_RADIUS + column * Domino.PIP_OFFSET_SPACING;
			for (let pip = 0; pip < Domino.PIPS_PER_COLUMN; pip++, mask <<= 1) {
				if ((this.value & mask) !== 0) {
					const cy = y + Domino.PIP_MARGIN + Domino.PIP_RADIUS + pip * Domino.PIP_OFFSET_SPACING;
					out += `<circle cx="${cx.toFixed(4)}" cy="${cy.toFixed(4)}" r="${Domino.PIP_RADIUS.toFixed(4)}" fill="white" />\n`;
				}
			}
		}

		return out;
	}
}
