Add-Type -AssemblyName System.Drawing
foreach ($size in @(192, 512)) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#173f35'))
  $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#ece8c2'), ($size * 0.027))
  $start = $size * 0.25
  $span = $size * 0.5
  $graphics.DrawRectangle($pen, $start, $start, $span, $span)
  for ($i = 1; $i -le 2; $i++) {
    $pos = $start + $span * $i / 3
    $graphics.DrawLine($pen, $pos, $start, $pos, $start + $span)
    $graphics.DrawLine($pen, $start, $pos, $start + $span, $pos)
  }
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#c8d69e'))
  $graphics.FillEllipse($brush, ($size * 0.46), ($size * 0.46), ($size * 0.08), ($size * 0.08))
  $bitmap.Save((Join-Path (Get-Location) "public/icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $brush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
