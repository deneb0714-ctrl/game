param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile
)

# Check if ffmpeg is in PATH or find it
$ffmpeg = "ffmpeg"
if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    $localFfmpeg = Get-ChildItem -Path $env:LOCALAPPDATA\Microsoft\WinGet\Packages -Filter ffmpeg.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($localFfmpeg) {
        $ffmpeg = $localFfmpeg
    } else {
        Write-Host "ffmpegが見つかりません。'winget install Gyan.FFmpeg' を実行してインストールしてください。" -ForegroundColor Red
        exit 1
    }
}

$outputFile = [System.IO.Path]::ChangeExtension($InputFile, ".mp3")

Write-Host "${InputFile} を ${outputFile} に変換中..." -ForegroundColor Cyan
& $ffmpeg -i "$InputFile" -b:a 128k "$outputFile" -y

if ($LASTEXITCODE -eq 0) {
    Write-Host "変換が完了しました！: ${outputFile}" -ForegroundColor Green
    Write-Host "元の .wav ファイルは削除しても問題ありません。" -ForegroundColor Yellow
} else {
    Write-Host "変換中にエラーが発生しました。" -ForegroundColor Red
}
