// <copyright file="MeasurementHelpers.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

namespace ShaperDominoLib;

public static class MeasurementHelpers
{
    public static Measurement Inches(this double value) => new(value, UnitOfMeasure.Inches);
    public static Measurement Millimeters(this double value) => new(value, UnitOfMeasure.Millimeters);
    public static Measurement Centimeters(this double value) => new(value * 10, UnitOfMeasure.Millimeters);

    public static Measurement Inches(this int value) => new(value, UnitOfMeasure.Inches);
    public static Measurement Millimeters(this int value) => new(value, UnitOfMeasure.Millimeters);
    public static Measurement Centimeters(this int value) => new(value * 10, UnitOfMeasure.Millimeters);
}
