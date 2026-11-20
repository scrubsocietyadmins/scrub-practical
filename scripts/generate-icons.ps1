Add-Type -AssemblyName System.Drawing

$srcPath = "D:\scrub practical\public\logo.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Icon($width, $height, $outPath, $paddingPercent = 0) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($paddingPercent -gt 0) {
        # Fill background with dark brand color for maskable icons
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 15, 25))
        $g.FillRectangle($bgBrush, 0, 0, $width, $height)
        $bgBrush.Dispose()

        $padX = [int]($width * $paddingPercent / 100)
        $padY = [int]($height * $paddingPercent / 100)
        $drawW = $width - (2 * $padX)
        $drawH = $height - (2 * $padY)
        $g.DrawImage($src, $padX, $padY, $drawW, $drawH)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($src, 0, 0, $width, $height)
    }

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($width x $height)"
}

Resize-Icon 192 192 "D:\scrub practical\public\icon-192.png" 0
Resize-Icon 512 512 "D:\scrub practical\public\icon-512.png" 0
Resize-Icon 192 192 "D:\scrub practical\public\icon-maskable-192.png" 12
Resize-Icon 512 512 "D:\scrub practical\public\icon-maskable-512.png" 12
Resize-Icon 180 180 "D:\scrub practical\public\apple-touch-icon.png" 0

$src.Dispose()
Write-Host "All PWA icons successfully generated."
