param(
  [string]$Repo = 'Wertoquri/ARCHGUARD',
  [string]$Branch = 'feature/ui-changelog-ci',
  [int]$TimeoutSeconds = 900
)

Write-Output "Repo: $Repo";
Write-Output "Branch: $Branch";

$prev = gh run list --repo $Repo --branch $Branch --limit 1 --json databaseId --jq '.[0].databaseId' 2>$null
$prev = $prev -replace "\r?\n",""
Write-Output "PrevRun:$prev"

git add .github/workflows/feature-ci.yml .github/workflows/ci.yml
# commit only if there are staged changes: run the quiet diff and inspect the exit code
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "ci: expand pre-upload coverage debug to include c8/node versions and non-zero DA counts" | Write-Output
} else {
  Write-Output 'No staged changes to commit'
}

git push origin HEAD:$Branch

$elapsed = 0
while ($true) {
  $item = gh run list --repo $Repo --branch $Branch --limit 1 --json databaseId,status,conclusion --jq '.[0]' 2>$null
  if ($item) {
    $obj = $item | ConvertFrom-Json
    Write-Output ("LatestRun: id=$($obj.databaseId) status=$($obj.status) conclusion=$($obj.conclusion)")
    if ($obj.databaseId -ne $prev) {
      $runId = $obj.databaseId
      break
    }
  } else {
    Write-Output 'NO_RUNS'
  }
  Start-Sleep -Seconds 5
  $elapsed += 5
  if ($elapsed -gt $TimeoutSeconds) { Write-Output 'TIMEOUT_WAITING_FOR_NEW_RUN'; break }
}

if (-not $runId) { Write-Output 'NO_NEW_RUN_DETECTED'; exit 0 }

Write-Output "TriggeredRun:$runId"

# Wait for completion
while ($true) {
  $r = gh run view $runId --repo $Repo --json databaseId,status,conclusion --jq '.' 2>$null
  $st = $r | ConvertFrom-Json
  Write-Output ("POLL: id=$($st.databaseId) status=$($st.status) conclusion=$($st.conclusion)")
  if ($st.status -eq 'completed') { break }
  Start-Sleep -Seconds 5
}

# Download artifact
# Ensure target dir is clean to avoid archive extraction errors
if (Test-Path 'tmp\coverage-artifact-fresh') {
  Remove-Item -Recurse -Force 'tmp\coverage-artifact-fresh'
}
New-Item -ItemType Directory -Force -Path 'tmp\coverage-artifact-fresh' | Out-Null

gh run download $runId --repo $Repo --name coverage-report --dir tmp\coverage-artifact-fresh
if ($LASTEXITCODE -ne 0) { Write-Output 'DOWNLOAD_FAILED' }

# Support lcov at either coverage/lcov.info or at the artifact root lcov.info
$lcovCandidates = @(
  'tmp\coverage-artifact-fresh\coverage\lcov.info',
  'tmp\coverage-artifact-fresh\lcov.info'
)
$foundLcov = ""
foreach ($p in $lcovCandidates) {
  if (Test-Path $p) { $foundLcov = $p; break }
}

if ($foundLcov) {
  Write-Output ("LCOV_FOUND: $foundLcov")
  (Get-Item $foundLcov).Length
  Get-Content $foundLcov -TotalCount 200
  if (Test-Path 'tmp\coverage-artifact-fresh\coverage_summary.json') {
    Write-Output 'COVERAGE_SUMMARY_JSON:'
    Get-Content 'tmp\coverage-artifact-fresh\coverage_summary.json' -Raw
  }
  exit 0
} else {
  Write-Output 'NO_LCOV'
  Get-ChildItem -Recurse tmp\coverage-artifact-fresh | Select-Object FullName, Length
  # If there are any zip archives present, list their entries for debugging
  $zips = Get-ChildItem -Path 'tmp\coverage-artifact-fresh' -Filter '*.zip' -Recurse -ErrorAction SilentlyContinue
  if ($zips) {
    foreach ($z in $zips) {
      Write-Output "ZIP_ARCHIVE: $($z.FullName)"
      try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction SilentlyContinue
        $zip = [System.IO.Compression.ZipFile]::OpenRead($z.FullName)
        foreach ($entry in $zip.Entries) {
          Write-Output ("  ENTRY: {0} ({1} bytes)" -f $entry.FullName, $entry.Length)
        }
        $zip.Dispose()
      } catch {
        Write-Output "  (failed to enumerate zip contents: $($_.Exception.Message))"
      }
    }
  }
  # Return non-zero so calling scripts can detect the missing lcov
  exit 2
}
