$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Wander engine..." -ForegroundColor Green
$engine = Start-Process -FilePath "$ROOT\engine\wander_engine.exe" -WorkingDirectory "$ROOT\engine" -PassThru -NoNewWindow

Write-Host "Starting HMM server..." -ForegroundColor Green
$hmm = Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "$ROOT\hmm" -PassThru -NoNewWindow

Write-Host "Starting frontend..." -ForegroundColor Green
$frontend = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$ROOT\frontend" -PassThru -NoNewWindow

Write-Host ""
Write-Host "All services started. Press Ctrl+C to stop all." -ForegroundColor Cyan
Write-Host "  Engine:   http://localhost:8081/health"
Write-Host "  Frontend: http://localhost:3000"
Write-Host ""

try {
    Wait-Process -Id $frontend.Id
} finally {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    $engine, $hmm, $frontend | ForEach-Object {
        if ($_ -and !$_.HasExited) { $_.Kill() }
    }
}
