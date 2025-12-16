// <copyright file="Measurement.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

namespace ShaperDominoLib;

using System;
using System.Globalization;

/// <summary>
/// Represents a measurement value with an associated unit of measure.
/// </summary>
public readonly record struct Measurement(double Value, UnitOfMeasure Unit)
{
    private const double MillimetersPerInch = 25.4;

    /// <summary>
    /// Parses a string representation of a measurement.
    /// Supports: "8.5in", "8 1/2\"", "8-1/2in", "210mm", "21cm", "1.5" (assumes inches).
    /// Imperial measurements support fractions. Metric does not.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <returns>A new Measurement instance.</returns>
    /// <exception cref="FormatException">Thrown when the string format is invalid.</exception>
    public static Measurement Parse(string s)
    {
        if (string.IsNullOrWhiteSpace(s))
        {
            throw new FormatException("Measurement string cannot be null or empty.");
        }

        s = s.Trim();

        // Check for metric unit suffixes (cm, mm)
        if (s.EndsWith("cm", StringComparison.OrdinalIgnoreCase))
        {
            string valueStr = s[..^2].Trim();
            if (double.TryParse(valueStr, NumberStyles.Float, CultureInfo.InvariantCulture, out double value))
            {
                return (value * 10).Millimeters(); // Convert cm to mm
            }

            throw new FormatException($"Invalid centimeter measurement: '{s}'.");
        }
        else if (s.EndsWith("mm", StringComparison.OrdinalIgnoreCase))
        {
            string valueStr = s[..^2].Trim();
            return double.TryParse(valueStr, NumberStyles.Float, CultureInfo.InvariantCulture, out double value)
                ? value.Millimeters()
                : throw new FormatException($"Invalid millimeter measurement: '{s}'.");
        }

        // Check for imperial unit suffixes (in, ")
        string imperialValueStr;
        if (s.EndsWith("in", StringComparison.OrdinalIgnoreCase))
        {
            imperialValueStr = s[..^2].Trim();
        }
        else if (s.EndsWith('"'))
        {
            imperialValueStr = s[..^1].Trim();
        }
        else
        {
            // No unit specified, assume inches
            imperialValueStr = s;
        }

        // Try parsing imperial with fraction support
        return TryParseImperialWithFraction(imperialValueStr, out double inches)
            ? inches.Inches()
            : throw new FormatException($"Invalid measurement format: '{s}'. Expected format: '8.5', '8 1/2\"', '8-1/2in', '210mm', or '21cm'.");
    }

    private static bool TryParseImperialWithFraction(string s, out double result)
    {
        s = s.Trim();

        // Try simple decimal first
        if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out result))
        {
            return true;
        }

        // Check for fractions: supports "8 1/2" or "8-1/2" (proper) and "17/2" (improper)
        int wholeNumber = 0;
        string fractionPart = s;

        // Handle proper fractions with space or dash separator (e.g., "8 1/2" or "8-1/2")
        int spaceIndex = s.IndexOf(' ');
        int dashIndex = s.IndexOf('-');
        int separatorIndex = spaceIndex >= 0 ? spaceIndex : dashIndex;

        if (separatorIndex > 0)
        {
            string wholePart = s[..separatorIndex].Trim();
            if (!int.TryParse(wholePart, NumberStyles.Integer, CultureInfo.InvariantCulture, out wholeNumber))
            {
                return false;
            }

            fractionPart = s[(separatorIndex + 1)..].Trim();
        }

        // Parse the fraction part (e.g., "1/2")
        int slashIndex = fractionPart.IndexOf('/');
        if (slashIndex <= 0)
        {
            return false; // No fraction found
        }

        string numeratorStr = fractionPart[..slashIndex].Trim();
        string denominatorStr = fractionPart[(slashIndex + 1)..].Trim();

        if (!int.TryParse(numeratorStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out int numerator) ||
            !int.TryParse(denominatorStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out int denominator) ||
            denominator == 0)
        {
            return false;
        }

        result = wholeNumber + (double)numerator / denominator;
        return true;
    }

    /// <summary>
    /// Tries to parse a string representation of a measurement.
    /// </summary>
    /// <param name="s">The string to parse.</param>
    /// <param name="result">The parsed measurement if successful.</param>
    /// <returns>True if parsing succeeded, false otherwise.</returns>
    public static bool TryParse(string s, out Measurement result)
    {
        try
        {
            result = Parse(s);
            return true;
        }
        catch
        {
            result = default;
            return false;
        }
    }

    /// <summary>
    /// Converts this measurement to inches.
    /// </summary>
    /// <returns>The value in inches.</returns>
    public double ToInches()
    {
        return Unit == UnitOfMeasure.Inches ? Value : Value / MillimetersPerInch;
    }

    /// <summary>
    /// Converts this measurement to millimeters.
    /// </summary>
    /// <returns>The value in millimeters.</returns>
    public double ToMillimeters()
    {
        return Unit == UnitOfMeasure.Millimeters ? Value : Value * MillimetersPerInch;
    }

    /// <summary>
    /// Returns a string representation of this measurement.
    /// </summary>
    /// <returns>A string in the format "value unit".</returns>
    public override string ToString()
    {
        return Unit == UnitOfMeasure.Inches ? $"{Value:F3}in" : $"{Value:F2}mm";
    }
}
