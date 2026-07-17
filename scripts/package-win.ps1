# Builds a portable, double-clickable Windows package of the Dance School
# Management System. No Node.js/npm needed on the target machine.
#
# Usage:  npm run package:win        (or: powershell -File scripts/package-win.ps1)
# Output: dist\DanceSchoolMS\  and  dist\DanceSchoolMS-UAT-<date>.zip
#
# Package layout:
#   DanceSchoolMS\
#     DanceSchoolMS.exe   launcher (starts server, opens browser, stops on close)
#     UAT-GUIDE.txt       instructions + demo accounts for the tester
#     app\                Next.js standalone build (server.js + pruned node_modules)
#     runtime\node.exe    bundled Node.js runtime
#     data\               dance-school.db (seeded), secret.txt + server.log at runtime

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Copy-Tree($src, $dst) {
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $src -> $dst (code $LASTEXITCODE)" }
    $global:LASTEXITCODE = 0
}

Write-Host "[1/7] Reseeding demo database..."
npm run db:seed | Out-Null
if ($LASTEXITCODE -ne 0) { throw "db:seed failed" }

Write-Host "[2/7] Building Next.js standalone bundle..."
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw "next build failed" }
if (-not (Test-Path "$root\.next\standalone\server.js")) { throw "standalone output missing — is output:'standalone' set in next.config.ts?" }

Write-Host "[3/7] Assembling package..."
$dist = "$root\dist\DanceSchoolMS"
if (Test-Path "$root\dist") { Remove-Item -Recurse -Force "$root\dist" }
New-Item -ItemType Directory -Force "$dist\app", "$dist\data", "$dist\runtime" | Out-Null

Copy-Tree "$root\.next\standalone" "$dist\app"
Copy-Tree "$root\.next\static" "$dist\app\.next\static"
if (Test-Path "$root\public") { Copy-Tree "$root\public" "$dist\app\public" }

# Belt-and-braces: ensure the Prisma client + native query engine are present.
Copy-Tree "$root\node_modules\.prisma" "$dist\app\node_modules\.prisma"
Copy-Tree "$root\node_modules\@prisma\client" "$dist\app\node_modules\@prisma\client"

Write-Host "[4/7] Bundling Node.js runtime..."
$nodeSrc = (Get-Command node).Source
Copy-Item $nodeSrc "$dist\runtime\node.exe"

Write-Host "[5/7] Copying seeded database..."
Copy-Item "$root\prisma\dev.db" "$dist\data\dance-school.db"

Write-Host "[6/7] Compiling launcher exe..."
$csc = "$env:windir\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = "$env:windir\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path $csc)) { throw "csc.exe not found — .NET Framework 4.x is required to build the launcher" }
& $csc /nologo /optimize+ /target:exe /platform:anycpu /out:"$dist\DanceSchoolMS.exe" "$root\scripts\launcher\Launcher.cs"
if ($LASTEXITCODE -ne 0) { throw "launcher compilation failed" }

Copy-Item "$root\scripts\package-assets\UAT-GUIDE.txt" "$dist\UAT-GUIDE.txt"

Write-Host "[7/7] Creating zip..."
$stamp = Get-Date -Format "yyyy-MM-dd"
$zip = "$root\dist\DanceSchoolMS-UAT-$stamp.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
& "$env:windir\System32\tar.exe" -a -c -f $zip -C "$root\dist" DanceSchoolMS
if ($LASTEXITCODE -ne 0) { throw "zip creation failed" }

$size = "{0:N1} MB" -f ((Get-Item $zip).Length / 1MB)
Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "  Folder: $dist"
Write-Host "  Zip:    $zip ($size)"
