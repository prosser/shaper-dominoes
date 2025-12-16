// <copyright file="PageSetup.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

namespace ShaperDominoLib;

public readonly record struct PageSetup(Measurement Width, Measurement? Height, Measurement? Margin)
{
    public static PageSetup LetterPortrait(Measurement? margin = null) => new(8.5.Inches(), 11.Inches(), margin ?? 0.25.Inches());
    public static PageSetup LetterLandscape(Measurement? margin = null) => new(11.Inches(), 8.5.Inches(), margin ?? 0.25.Inches());
    public static PageSetup A4Portrait(Measurement? margin = null) => new(210.Millimeters(), 297.Millimeters(), margin ?? 10.Millimeters());
    public static PageSetup A4Landscape(Measurement? margin = null) => new(297.Millimeters(), 210.Millimeters(), margin ?? 10.Millimeters());

    public static PageSetup ContinuousLabel(Measurement width, Measurement? margin = null) => new(width, null, margin ?? 0.125.Inches());
}