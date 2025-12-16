// <copyright file="DominoFactory.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

namespace ShaperDominoLib;

using System;
using System.Collections.Generic;
using System.IO;
using System.Numerics;
using System.Runtime.CompilerServices;
using System.Text;

using PdfSharp.Drawing;
using PdfSharp.Pdf;

/// <summary>
/// Initializes a new instance of the <see cref="DominoFactory"/> class.
/// </summary>
/// <param name="stripSpacing">The spacing between domino strips on a page (default: 0.125 inches).</param>
public class DominoFactory(Measurement? stripSpacing = null, PageSetup? pageSetup = null)
{
    private const int ColumnMask = 0xFF; // Mask for a single column (8 bits)
    private const int ConstantPipsMask = 0b10000001_10000001; // Bits 0 and 7 in both columns are always set to 1
    private const int DataBitsMask = ~ConstantPipsMask & 0xFFFF; // Data is encoded into all the bits that are not constant
    private const int MinDominoValue = 0b10000001_11111111; // a number where the first column has at least 4 pips and the second column has at least 4 pips
    private const int MaxDominoValue = 0b11111111_10000001; // the largest possible domino value (both columns full, but not a mirror image)
    private static readonly byte[] Reverse8 = CreateReverseTable();
    private static readonly IReadOnlyList<int> ValidDominoes = BuildValidDominoesList();

    public static IReadOnlyList<int> GetValidDominoes() => ValidDominoes;

    private readonly Measurement stripSpacing = stripSpacing ?? 0.125.Inches();
    private readonly PageSetup pageSetup = pageSetup ?? PageSetup.LetterPortrait(0.25.Inches());

    /// <summary>
    /// Diagnostic method to check for symmetric dominoes in the valid list.
    /// </summary>
    public static void CheckForSymmetricDominoes()
    {
        Console.WriteLine($"Total valid dominoes: {ValidDominoes.Count}");
        int symmetricCount = 0;
        
        foreach (int value in ValidDominoes)
        {
            int col0 = value & ColumnMask;
            int col1 = (value >> 8) & ColumnMask;
            int rotated180 = (Reverse8[col1] << 8) | Reverse8[col0];
            
            if (value == rotated180)
            {
                symmetricCount++;
                Console.WriteLine($"Found symmetric domino: {Convert.ToString(value, 2).PadLeft(16, '0')}");
            }
        }
        
        Console.WriteLine($"Symmetric dominoes found: {symmetricCount}");
    }

    /// <summary>
    /// Diagnostic method to print the first N dominoes.
    /// </summary>
    public static void PrintFirstDominoes(int count)
    {
        count = Math.Min(count, ValidDominoes.Count);
        for (int i = 0; i < count; i++)
        {
            int value = ValidDominoes[i];
            int col0 = value & ColumnMask;
            int col1 = (value >> 8) & ColumnMask;
            int rotated180 = (Reverse8[col1] << 8) | Reverse8[col0];
            
            Console.WriteLine($"{i + 1}. Value: {value:X4} Binary: {Convert.ToString(value, 2).PadLeft(16, '0')}");
            Console.WriteLine($"   Col0: {Convert.ToString(col0, 2).PadLeft(8, '0')} Col1: {Convert.ToString(col1, 2).PadLeft(8, '0')}");
            Console.WriteLine($"   Rotated: {Convert.ToString(rotated180, 2).PadLeft(16, '0')}");
        }
    }

    /// <summary>
    /// Generate multiple pages of dominoes as a PDF document.
    /// </summary>
    /// <param name="pageCount">The number of pages to generate.</param>
    /// <returns>A MemoryStream containing the PDF document. The caller is responsible for disposing the stream.</returns>
    public MemoryStream GeneratePagesPdf(int pageCount)
    {
        (int dominoesPerRow, int dominoesPerPage) = CalculatePageLayout();
        int totalDominoes = pageCount * dominoesPerPage;

        int[] dominoValues = GenerateRandomUniqueDominoes(totalDominoes);
        return GeneratePdf(dominoValues, dominoesPerRow, centerOnPageX: true);
    }

    /// <summary>
    /// Generate multiple pages of dominoes with automatic column calculation based on page size.
    /// </summary>
    /// <param name="pageCount">The number of pages to generate.</param>
    /// <param name="pageWidth">The width of the page (default 8.5" for US Letter).</param>
    /// <param name="pageHeight">The height of the page (default 11" for US Letter).</param>
    /// <param name="printMargin">The margin around the printable area (default 0.25").</param>
    /// <returns>An SVG document containing the dominoes arranged in columns to fill the pages.</returns>
    public string GeneratePagesSvg(int pageCount)
    {
        (int dominoesPerRow, int dominoesPerPage) = CalculatePageLayout();
        int totalDominoes = pageCount * dominoesPerPage;

        return GenerateSvg(totalDominoes, dominoesPerRow, centerOnPageX: true);
    }

    /// <summary>
    /// Generate a continuous strip of dominoes as a PDF document.
    /// </summary>
    /// <param name="count">The number of dominoes to generate.</param>
    /// <param name="stripWidth">The width of the strip (default 1").</param>
    /// <returns>A MemoryStream containing the PDF document. The caller is responsible for disposing the stream.</returns>
    public MemoryStream GenerateStripPdf(int count, Measurement? stripWidth = null, Measurement? maxStripLength = null)
    {
        int[] dominoValues = GenerateRandomUniqueDominoes(count);
        return GeneratePdf(dominoValues, 1, centerOnPageX: true);
    }

    /// <summary>
    /// Generate a continuous strip of dominoes (single column layout) for label makers or similar devices.
    /// </summary>
    /// <param name="count">The number of dominoes to generate.</param>
    /// <param name="stripWidth">The width of the strip (default 1").</param>
    /// <returns>An SVG document containing the dominoes in a single vertical column.</returns>
    public string GenerateStripSvg(int count)
    {
        return GenerateSvg(count, dominoesPerRow: 1, centerOnPageX: true);
    }

    private static List<int> BuildValidDominoesList()
    {
        HashSet<int> uniqueDominoes = [];
        List<int> validDominoes = [];
        
        // Only iterate through the 12 data bits (6 bits in each column, excluding constant bits 0 and 7)
        // We need exactly 6 bits set among these 12 bits
        // This is C(12,6) = 924 combinations instead of checking ~65K values
        for (int dataBits = 0; dataBits < (1 << 12); dataBits++)
        {
            // Check if exactly 6 bits are set
            if (BitOperations.PopCount((uint)dataBits) != 6)
            {
                continue;
            }

            // Construct the full 16-bit domino value by adding the constant bits
            // Data bits 0-5 go into column 0 bits 1-6
            // Data bits 6-11 go into column 1 bits 1-6
            int col0Data = (dataBits & 0x3F) << 1; // bits 0-5 -> column 0 bits 1-6
            int col1Data = ((dataBits >> 6) & 0x3F) << 1; // bits 6-11 -> column 1 bits 1-6
            
            // Add constant bits (bit 0 and bit 7 in each column)
            int col0 = col0Data | 0b10000001;
            int col1 = col1Data | 0b10000001;
            
            int value = col0 | (col1 << 8);

            // Rule 3: Reject binary palindromes (col0 reversed == col1)
            // This prevents ambiguity when viewing from different directions
            if (Reverse8[col0] == col1)
            {
                continue;
            }

            // Avoid duplicates
            if (uniqueDominoes.Add(value))
            {
                validDominoes.Add(value);
            }
        }

        return validDominoes;
    }

    private (int DominoesPerRow, int DominoesPerPage) CalculatePageLayout()
    {
        double marginInches = pageSetup.Margin?.ToInches() ?? 0;
        double heightInches = pageSetup.Height?.ToInches() ?? double.MaxValue;
        double stripSpacingInches = stripSpacing.ToInches();
        double printableWidth = pageSetup.Width.ToInches() - 2 * marginInches;
        double printableHeight = heightInches - 2 * marginInches;

        int dominoesPerColumn = (int)Math.Floor((printableHeight - Domino.DominoMargin) / (Domino.DominoHeight + Domino.DominoMargin));
        int dominoesPerRow = (int)Math.Floor(printableWidth / (Domino.DominoWidth + stripSpacingInches));
        int dominoesPerPage = dominoesPerColumn * dominoesPerRow;

        return (dominoesPerRow, dominoesPerPage);
    }

    private static double CalculateTotalHeight(int count, int dominoesPerRow)
    {
        return Math.Ceiling((double)count / dominoesPerRow) * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;
    }

    private static double CalculateXMargin(double pageWidth, int dominoesPerRow, bool centerOnPageX, double stripSpacing)
    {
        if (!centerOnPageX)
        {
            return stripSpacing;
        }

        // Need dominoesPerRow + 1 spacings: one before each domino and one after the last
        double usedWidth = dominoesPerRow * Domino.DominoWidth + (dominoesPerRow + 1) * stripSpacing;
        double remainingWidth = pageWidth - usedWidth;
        return stripSpacing + remainingWidth / 2;
    }

    private static byte[] CreateReverseTable()
    {
        byte[] t = new byte[256];
        for (int i = 0; i < 256; i++)
        {
            int v = i;
            int r = 0;
            for (int b = 0; b < 8; b++)
            {
                r = r << 1 | v & 1;
                v >>= 1;
            }

            t[i] = (byte)r;
        }

        return t;
    }

    private MemoryStream GeneratePdf(int[] dominoValues, int dominoesPerRow, bool centerOnPageX = true)
    {
        const double PointsPerInch = 72.0;
        int count = dominoValues.Length;

        double pageWidth = pageSetup.Width.ToInches();
        double? pageHeight = pageSetup.Height?.ToInches();
        double stripSpacingInches = stripSpacing.ToInches();

        double xMargin = CalculateXMargin(pageWidth, dominoesPerRow, centerOnPageX, stripSpacingInches);
        double measuredHeight = CalculateTotalHeight(count, dominoesPerRow);

        // Use provided page height or measured height for continuous strip
        double actualPageHeight = pageHeight ?? measuredHeight;

        // Create PDF document
        PdfDocument document = new();

        // Calculate dominoes per page if using fixed page height
        int dominoesPerPage = pageHeight.HasValue
            ? (int)Math.Floor((pageHeight.Value - Domino.DominoMargin) / (Domino.DominoHeight + Domino.DominoMargin)) * dominoesPerRow
            : count;

        int remainingDominoes = count;
        int currentIndex = 0;

        while (remainingDominoes > 0)
        {
            int dominoesThisPage = Math.Min(remainingDominoes, dominoesPerPage);

            // Add a page
            PdfPage page = document.AddPage();
            page.Width = XUnit.FromInch(pageWidth);
            page.Height = XUnit.FromInch(actualPageHeight);

            // Get graphics object for drawing
            using var gfx = XGraphics.FromPdfPage(page);

            // Render dominoes on this page
            for (int i = 0; i < dominoesThisPage; i++)
            {
                int globalIndex = currentIndex + i;
                Domino domino = new(dominoValues[globalIndex]);

                int ix = i % dominoesPerRow;
                int iy = i / dominoesPerRow;

                RenderDominoToPdf(gfx, ref domino, ix, iy, xMargin, PointsPerInch, stripSpacingInches);
            }

            currentIndex += dominoesThisPage;
            remainingDominoes -= dominoesThisPage;
        }

        // Save the document to a memory stream
        MemoryStream stream = new();
        document.Save(stream, false);
        stream.Position = 0;
        return stream;
    }

    private static int[] GenerateRandomUniqueDominoes(int count)
    {
        List<int> availableDominoes = [.. ValidDominoes];

        if (count > availableDominoes.Count)
        {
            throw new InvalidOperationException($"Requested {count} unique dominoes, but only {availableDominoes.Count} valid dominoes exist.");
        }

        // Fisher-Yates shuffle: O(count) - only shuffle what we need
        int[] result = new int[count];
        for (int i = 0; i < count; i++)
        {
            int randomIndex = Random.Shared.Next(i, availableDominoes.Count);
            result[i] = availableDominoes[randomIndex];

            // Swap to avoid reusing this value
            availableDominoes[randomIndex] = availableDominoes[i];
        }

        return result;
    }

    private string GenerateSvg(int count, int dominoesPerRow, bool centerOnPageX = true)
    {
        double pageWidth = pageSetup.Width.ToInches();
        double stripSpacingInches = stripSpacing.ToInches();

        // Generate random unique domino values using Fisher-Yates shuffle of valid dominoes
        int[] dominoValues = GenerateRandomUniqueDominoes(count);

        double xMargin = CalculateXMargin(pageWidth, dominoesPerRow, centerOnPageX, stripSpacingInches);
        double measuredHeight = CalculateTotalHeight(count, dominoesPerRow);

        StringBuilder svg = new();

        // initialize the svg document using inches as the unit of measure
        _ = svg.AppendLine($"""
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{pageWidth:F2}in" height="{measuredHeight:F2}in" viewBox="0 0 {pageWidth:F2} {measuredHeight:F2}" >
            """);

        for (int i = 0; i < count; i++)
        {
            Domino domino = new(dominoValues[i]);
            int ix = i % dominoesPerRow;
            int iy = i / dominoesPerRow;
            _ = svg.AppendLine(domino.ToSvgShape(ix, iy, xMargin, stripSpacingInches));
        }

        _ = svg.AppendLine("</svg>");

        return svg.ToString();
    }

    private static void RenderDominoToPdf(XGraphics gfx, ref Domino domino, int dxOffset, int dyOffset, double xMargin, double pointsPerInch, double stripSpacing)
    {
        // Calculate position in inches then convert to points
        double xInches = dxOffset * (Domino.DominoWidth + stripSpacing) + xMargin;
        double yInches = dyOffset * (Domino.DominoHeight + Domino.DominoMargin) + Domino.DominoMargin;

        double x = xInches * pointsPerInch;
        double y = yInches * pointsPerInch;
        double width = Domino.DominoWidth * pointsPerInch;
        double height = Domino.DominoHeight * pointsPerInch;
        double cornerRadius = 0.1 * pointsPerInch;

        // Draw the black rectangle with rounded corners
        XPen blackPen = new(XColors.Black, 0.5);
        XBrush blackBrush = XBrushes.Black;
        gfx.DrawRoundedRectangle(blackPen, blackBrush, x, y, width, height, cornerRadius, cornerRadius);

        // Draw the white pips
        domino.RenderPipsToPdf(gfx, xInches, yInches, pointsPerInch);
    }
}
