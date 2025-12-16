// <copyright file="Domino.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

namespace ShaperDominoLib;

using System.Text;
using PdfSharp.Drawing;

/// <summary>
/// A class representing a Shaper Origin "domino". This is a rectangular shape with two columns of pips, each column containing 8 pips.
/// </summary>
/// <param name="Value">The numeric value of the domino.</param>
internal readonly record struct Domino(int Value)
{
    public const double DominoMargin = 0.125; // 1/8" (between dominoes)
    public const double DominoHeight = PipDiameter * PipsPerColumn + PipMargin * (PipsPerColumn + 1); // 1.7"
    public const double DominoWidth = PipDiameter * ColumnsPerDomino + PipMargin * (ColumnsPerDomino + 1); // 1/2"

    private const int PipsPerColumn = 8;
    private const int ColumnsPerDomino = 2;

    private const double PipMargin = 0.1; // 0.1" (between pips & from the inner edge of the domino)
    private const double PipDiameter = 0.1; // 0.1"
    private const double PipRadius = PipDiameter / 2;

    private const double DominoRadius = 0.0625; // 1/16"

    private const double CornerRadius = 0.1; // 0.1"
    private const double PipOffsetSpacing = PipDiameter + PipMargin;

    /// <summary>
    /// Generates an SVG representation of the domino shape. This is not a complete SVG document, just the shape definition.
    /// </summary>
    /// <param name="dxOffset">The X offset of the domino shape in dominoes. Dimensions will be computed automatically.</param>
    /// <param name="dyOffset">The Y offset of the domino shape in dominoes. Dimensions will be computed automatically.</param>
    /// <param name="xMargin">The x-axis margin to use (defaults to DominoMargin if not specified).</param>
    /// <param name="stripSpacing">The spacing between domino strips (defaults to DominoMargin if not specified).</param>
    /// <returns>The SVG shape. Assumes inches are the unit of scale.</returns>
    public string ToSvgShape(int dxOffset, int dyOffset, double xMargin = DominoMargin, double stripSpacing = DominoMargin)
    {
        // Print representation:
        // 1. Each domino is a `DominoWidth` x `DominoHeight` black-filled rectangle with rounded corners. The corner radius is `CornerRadius`.
        // 2. Each domino has a margin of `DominoMargin` between it and any adjacent dominoes or the edge of the printable area.
        // 3. Each domino contains two rows of pips, each row containing 8 pips.
        // 4. Each domino contains 16-bits of information, encoded into the least-significant 16 bits of a 32-bit integer.
        //    The first 8 bits (bits 0-7) are represented by the first row of pips in the domino.
        //    The next 8 bits (bits 8-15) represent the second row of pips.
        // 5. Each bit represents either a white pip (1) or black pip (0) in a specific location on the domino half.
        //    Each pip has a diameter of `PipDiameter`, and has a margin of `PipMargin` from adjacent pips and the edges of the domino half.
        //    As black pips are the same color as the domino background, they are effectively invisible, and should be ignored in the SVG output.

        StringBuilder sb = new();

        // Domino rectangle. Note that these are long-edge vertical shapes.
        double x = dxOffset * (DominoWidth + stripSpacing) + xMargin;
        double y = dyOffset * (DominoHeight + DominoMargin) + DominoMargin;

        _ = sb.AppendLine($@"<rect x=""{x:F4}"" y=""{y:F4}"" width=""{DominoWidth:F4}"" height=""{DominoHeight:F4}"" rx=""{CornerRadius:F4}"" ry=""{CornerRadius:F4}"" fill=""black"" />");

        // Pips - use a rolling mask per row for readability and to avoid recomputing shifts

        for (int column = 0; column < ColumnsPerDomino; column++)
        {
            // mask points at the first bit of this column (bit 0..7 for col 0, 8..15 for col 1)
            int mask = 1 << column * PipsPerColumn;
            double cx = x + PipMargin + PipRadius + column * PipOffsetSpacing;
            for (int pip = 0; pip < PipsPerColumn; pip++, mask <<= 1)
            {
                if ((Value & mask) != 0)
                {
                    double cy = y + PipMargin + PipRadius + pip * PipOffsetSpacing;
                    _ = sb.AppendLine($@"<circle cx=""{cx:F4}"" cy=""{cy:F4}"" r=""{PipRadius:F4}"" fill=""white"" />");
                }
            }
        }

        return sb.ToString();
    }

    /// <summary>
    /// Renders the pips of this domino to a PDF graphics object.
    /// </summary>
    /// <param name="gfx">The PDF graphics object to draw on.</param>
    /// <param name="xInches">The x position of the domino in inches.</param>
    /// <param name="yInches">The y position of the domino in inches.</param>
    /// <param name="pointsPerInch">Conversion factor from inches to points.</param>
    internal void RenderPipsToPdf(XGraphics gfx, double xInches, double yInches, double pointsPerInch)
    {
        XBrush whiteBrush = XBrushes.White;
        
        for (int column = 0; column < ColumnsPerDomino; column++)
        {
            // mask points at the first bit of this column (bit 0..7 for col 0, 8..15 for col 1)
            int mask = 1 << column * PipsPerColumn;
            double cxInches = xInches + PipMargin + PipRadius + column * PipOffsetSpacing;
            for (int pip = 0; pip < PipsPerColumn; pip++, mask <<= 1)
            {
                if ((Value & mask) != 0)
                {
                    double cyInches = yInches + PipMargin + PipRadius + pip * PipOffsetSpacing;
                    double cx = cxInches * pointsPerInch;
                    double cy = cyInches * pointsPerInch;
                    double radius = PipRadius * pointsPerInch;
                    
                    gfx.DrawEllipse(whiteBrush, cx - radius, cy - radius, radius * 2, radius * 2);
                }
            }
        }
    }
}