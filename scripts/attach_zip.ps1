$src = 'D:\WEB\ARCHGUARD\migration_bundle_review.zip'
$dest = 'D:\WEB\taskflow\migration_bundle_review.zip'
if (-not (Test-Path $src)) { Write-Error 'ZIP_MISSING'; exit 1 }
Copy-Item -Path $src -Destination $dest -Force
Set-Location 'D:\WEB\taskflow'
git checkout refactor/auth-adapter-migrations-archguard
git add migration_bundle_review.zip
$status = git diff --cached --name-only
if (-not [string]::IsNullOrEmpty($status)) {
  git commit -m 'ARCHGUARD: add migration_bundle_review.zip'
  git push origin refactor/auth-adapter-migrations-archguard
  Write-Output 'COMMITTED'
} else {
  Write-Output 'NO_CHANGES'
}
