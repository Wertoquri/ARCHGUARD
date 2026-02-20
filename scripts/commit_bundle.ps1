$src = 'D:\WEB\ARCHGUARD\migration_bundle_review'
$dest = 'D:\WEB\taskflow'
if (-not (Test-Path $src)) { Write-Error 'SRC_MISSING'; exit 1 }
$destBundle = Join-Path $dest 'migration_bundle_review'
if (Test-Path $destBundle) { Remove-Item -Recurse -Force $destBundle }
Copy-Item -Path $src -Destination $dest -Recurse -Force
Set-Location $dest
git checkout main
try { git pull --ff-only origin main } catch { Write-Output 'pull-failed' }
git add migration_bundle_review
$changes = git status --porcelain
if ([string]::IsNullOrEmpty($changes)) { Write-Output 'NO_CHANGES'; exit 0 }
git commit -m 'ARCHGUARD: add migration bundle (migration_bundle_review)'
git push origin main
Write-Output 'DONE'
