// <copyright file="Program.cs">Copyright (c) Peter Rosser. All rights reserved.</copyright>

using ShaperDominoLib;
// Create a factory instance with workstation-like settings (1" strip spacing)
DominoFactory letterFactory = new(Measurement.Parse("1\""), PageSetup.LetterPortrait());
DominoFactory continuousLabelFactory = new(null, new(2.4.Inches(), 36.Inches(), 0.25.Inches())); //PageSetup.ContinuousLabel(4.0.Inches()));

// Can use implicit double->Measurement conversion (defaults to inches)

File.WriteAllText("sample.svg", continuousLabelFactory.GenerateStripSvg(100));
File.WriteAllText("sample-pages.svg", letterFactory.GeneratePagesSvg(7));

using MemoryStream stripPdfStream = continuousLabelFactory.GeneratePagesPdf(1); //.GenerateStripPdf(36, 4.0.Inches());
using FileStream stripPdfFile = File.Create("sample-strip.pdf");
stripPdfStream.CopyTo(stripPdfFile);

using MemoryStream pagesPdfStream = letterFactory.GeneratePagesPdf(4);
using FileStream pagesPdfFile = File.Create("sample-pages.pdf");
pagesPdfStream.CopyTo(pagesPdfFile);

// Example: Create factory with metric strip spacing
DominoFactory metricFactory = new(3.0.Millimeters(), PageSetup.A4Portrait());

// Example: Generate with explicit measurements
using MemoryStream a4PdfStream = metricFactory.GeneratePagesPdf(1);
using FileStream a4PdfFile = File.Create("sample-a4.pdf");
a4PdfStream.CopyTo(a4PdfFile);

Console.WriteLine("\nDone.");