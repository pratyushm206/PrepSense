param(
  [string]$SourcePath = (Join-Path $PSScriptRoot 'prepsense-logo-source.png'),
  [string]$PublicPath = (Join-Path (Split-Path $PSScriptRoot -Parent) '..\public')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public sealed class TransparentBrandMark {
  public Bitmap Bitmap { get; set; }
  public int CropLeft { get; set; }
  public int CropTop { get; set; }
  public int CropWidth { get; set; }
  public int CropHeight { get; set; }
}

public static class BrandImageProcessor {
  // The source paints the enclosed P counter with the same gradient as the bubble. Punch it out
  // explicitly so that the counter is transparent along with the dark P strokes.
  private static bool InCounter(int x, int y, int width, int height) {
    double px = (double)x / width, py = (double)y / height;
    double[,] polygon = {
      { .452, .411 }, { .535, .411 }, { .552, .420 }, { .567, .438 },
      { .580, .454 }, { .580, .466 }, { .574, .484 }, { .560, .497 },
      { .540, .504 }, { .486, .504 }, { .472, .510 }, { .462, .520 },
      { .452, .531 }
    };
    bool inside = false;
    int last = polygon.GetLength(0) - 1;
    for (int i = 0; i < polygon.GetLength(0); i++) {
      double xi = polygon[i, 0], yi = polygon[i, 1], xj = polygon[last, 0], yj = polygon[last, 1];
      bool crosses = ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (crosses) inside = !inside;
      last = i;
    }
    return inside;
  }

  public static TransparentBrandMark Create(string file) {
    using (var loaded = new Bitmap(file))
    using (var source = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(source)) g.DrawImageUnscaled(loaded, 0, 0);
      var rect = new Rectangle(0, 0, source.Width, source.Height);
      var srcData = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var sourceBytes = new byte[Math.Abs(srcData.Stride) * source.Height];
      Marshal.Copy(srcData.Scan0, sourceBytes, 0, sourceBytes.Length);
      source.UnlockBits(srcData);
      int left = source.Width, top = source.Height, right = -1, bottom = -1;
      for (int y = 0; y < source.Height; y++) {
        int row = y * Math.Abs(srcData.Stride);
        for (int x = 0; x < source.Width; x++) {
          int i = row + x * 4;
          double db = sourceBytes[i] - 6, dg = sourceBytes[i + 1] - 6, dr = sourceBytes[i + 2] - 9;
          double distance = Math.Sqrt(db * db + dg * dg + dr * dr);
          if (Math.Min(1, Math.Max(0, (distance - 24) / 46)) > 0) {
            if (x < left) left = x; if (x > right) right = x;
            if (y < top) top = y; if (y > bottom) bottom = y;
          }
        }
      }
      if (right < left || bottom < top) throw new InvalidOperationException("No logo pixels found above the transparency threshold.");
      int width = right - left + 1, height = bottom - top + 1;
      var output = new Bitmap(width, height, PixelFormat.Format32bppArgb);
      var outRect = new Rectangle(0, 0, width, height);
      var outData = output.LockBits(outRect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      var outputBytes = new byte[Math.Abs(outData.Stride) * height];
      for (int y = top; y <= bottom; y++) {
        int sourceRow = y * Math.Abs(srcData.Stride);
        int outputRow = (y - top) * Math.Abs(outData.Stride);
        for (int x = left; x <= right; x++) {
          int si = sourceRow + x * 4, oi = outputRow + (x - left) * 4;
          double db = sourceBytes[si] - 6, dg = sourceBytes[si + 1] - 6, dr = sourceBytes[si + 2] - 9;
          double distance = Math.Sqrt(db * db + dg * dg + dr * dr);
          double alpha = Math.Min(1, Math.Max(0, (distance - 24) / 46));
          if (InCounter(x, y, source.Width, source.Height)) alpha = 0;
          if (alpha <= 0) continue;
          outputBytes[oi] = (byte)Math.Round(Math.Min(255, Math.Max(0, (sourceBytes[si] - (1 - alpha) * 6) / alpha)));
          outputBytes[oi + 1] = (byte)Math.Round(Math.Min(255, Math.Max(0, (sourceBytes[si + 1] - (1 - alpha) * 6) / alpha)));
          outputBytes[oi + 2] = (byte)Math.Round(Math.Min(255, Math.Max(0, (sourceBytes[si + 2] - (1 - alpha) * 9) / alpha)));
          outputBytes[oi + 3] = (byte)Math.Round(alpha * 255);
        }
      }
      Marshal.Copy(outputBytes, 0, outData.Scan0, outputBytes.Length);
      output.UnlockBits(outData);
      return new TransparentBrandMark { Bitmap = output, CropLeft = left, CropTop = top, CropWidth = width, CropHeight = height };
    }
  }
}
'@ -ReferencedAssemblies @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location)

$SourcePath = [System.IO.Path]::GetFullPath($SourcePath)
$PublicPath = [System.IO.Path]::GetFullPath($PublicPath)
if (-not (Test-Path -LiteralPath $SourcePath)) { throw "Source image not found: $SourcePath" }
New-Item -ItemType Directory -Path $PublicPath -Force | Out-Null

function New-Bitmap([int]$Width, [int]$Height) {
  return [System.Drawing.Bitmap]::new($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function New-PaddedMark($Mark, [int]$CanvasSize, [double]$PaddingFraction) {
  $canvas = New-Bitmap $CanvasSize $CanvasSize
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $scale = [Math]::Min(($CanvasSize * (1 - (2 * $PaddingFraction))) / $Mark.Width, ($CanvasSize * (1 - (2 * $PaddingFraction))) / $Mark.Height)
  $width = [Math]::Max(1, [int][Math]::Round($Mark.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($Mark.Height * $scale))
  $graphics.DrawImage($Mark, [int](($CanvasSize - $width) / 2), [int](($CanvasSize - $height) / 2), $width, $height)
  $graphics.Dispose()
  return $canvas
}

function Save-Png($Bitmap, [string]$Path) { $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png) }

function Get-PngBytes($Bitmap) {
  $stream = [System.IO.MemoryStream]::new()
  $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $stream.ToArray(); $stream.Dispose(); return ,$bytes
}

function Write-PngIco([string]$Path, [object[]]$Entries) {
  $encoded = @()
  foreach ($entry in $Entries) { $encoded += ,(Get-PngBytes $entry) }
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  $writer = [System.IO.BinaryWriter]::new($stream)
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$Entries.Count)
  $offset = 6 + (16 * $Entries.Count)
  for ($i = 0; $i -lt $Entries.Count; $i++) {
    $size = $Entries[$i].Width
    $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
    $writer.Write([byte]$(if ($size -eq 256) { 0 } else { $size }))
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$encoded[$i].Length); $writer.Write([uint32]$offset)
    $offset += $encoded[$i].Length
  }
  foreach ($bytes in $encoded) { $writer.Write($bytes) }
  $writer.Dispose(); $stream.Dispose()
}

function New-HomeIcon([int]$Size, $Mark) {
  $canvas = New-Bitmap $Size $Size
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.Clear([System.Drawing.Color]::FromArgb(255, 10, 9, 8))
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $side = [int][Math]::Round($Size * 0.80)
  $markCanvas = New-PaddedMark $Mark $side 0.06
  $graphics.DrawImage($markCanvas, [int](($Size - $side) / 2), [int](($Size - $side) / 2), $side, $side)
  $markCanvas.Dispose(); $graphics.Dispose()
  return $canvas
}

function New-SocialPreview($Mark, [string]$Path) {
  $canvas = New-Bitmap 1200 630
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.Clear([System.Drawing.Color]::FromArgb(255, 10, 9, 8))

  foreach ($glow in @(
    @{ X = 170; Color = [System.Drawing.Color]::FromArgb(44, 62, 75, 200) },
    @{ X = 1030; Color = [System.Drawing.Color]::FromArgb(36, 199, 125, 46) }
  )) {
    $glowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $glowPath.AddEllipse($glow.X - 260, 55, 520, 520)
    $pathGradient = [System.Drawing.Drawing2D.PathGradientBrush]::new($glowPath)
    $pathGradient.CenterColor = $glow.Color
    $pathGradient.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 10, 9, 8))
    $graphics.FillEllipse($pathGradient, $glow.X - 260, 55, 520, 520)
    $pathGradient.Dispose(); $glowPath.Dispose()
  }

  $markCanvas = New-PaddedMark $Mark 300 0.06
  $graphics.DrawImage($markCanvas, 96, 165, 300, 300)

  $installed = [System.Drawing.Text.InstalledFontCollection]::new()
  $familyNames = @($installed.Families | ForEach-Object Name)
  $fontFamily = if ($familyNames -contains 'Segoe UI Semibold') { 'Segoe UI Semibold' } elseif ($familyNames -contains 'Segoe UI') { 'Segoe UI' } else { [System.Drawing.FontFamily]::GenericSansSerif }
  $wordmarkFont = [System.Drawing.Font]::new($fontFamily, 68, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $taglineFont = [System.Drawing.Font]::new($fontFamily, 27, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 220, 216, 211))
  $graphics.DrawString('PrepSense', $wordmarkFont, $white, 452, 244)
  $graphics.DrawString('AI mock interviews for campus placements', $taglineFont, $muted, 458, 333)
  Save-Png $canvas $Path
  $muted.Dispose(); $white.Dispose(); $taglineFont.Dispose(); $wordmarkFont.Dispose(); $installed.Dispose(); $markCanvas.Dispose(); $graphics.Dispose()
  return $canvas
}

$result = [BrandImageProcessor]::Create($SourcePath)
$mark = $result.Bitmap
Write-Output "Source crop: left=$($result.CropLeft), top=$($result.CropTop), width=$($result.CropWidth), height=$($result.CropHeight)"
foreach ($size in @(64, 128, 256, 512)) {
  $output = New-PaddedMark $mark $size 0.06
  Save-Png $output (Join-Path $PublicPath "logo-mark-$size.png")
  $output.Dispose()
}
$faviconEntries = @()
foreach ($size in @(16, 32, 48)) {
  $output = New-PaddedMark $mark $size 0.02
  Save-Png $output (Join-Path $PublicPath "favicon-$size.png")
  $faviconEntries += $output
}
Write-PngIco (Join-Path $PublicPath 'favicon.ico') $faviconEntries
foreach ($bitmap in $faviconEntries) { $bitmap.Dispose() }

foreach ($size in @(180, 192, 512)) {
  $homeIcon = New-HomeIcon $size $mark
  $name = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
  Save-Png $homeIcon (Join-Path $PublicPath $name)
  $homeIcon.Dispose()
}
$preview = New-SocialPreview $mark (Join-Path $PublicPath 'og-image.png')
$preview.Dispose(); $mark.Dispose()
