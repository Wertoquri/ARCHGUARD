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
# commit only if there are staged changes
if (-not (git diff --cached --quiet)) {
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
gh run download $runId --repo $Repo --name coverage-report --dir tmp\coverage-artifact-fresh
if ($LASTEXITCODE -ne 0) { Write-Output 'DOWNLOAD_FAILED' }

if (Test-Path 'tmp\coverage-artifact-fresh\coverage\lcov.info') {
  Write-Output 'LCOV_FOUND'
  (Get-Item 'tmp\coverage-artifact-fresh\coverage\lcov.info').Length
  Get-Content 'tmp\coverage-artifact-fresh\coverage\lcov.info' -TotalCount 200
} else {
  Write-Output 'NO_LCOV'
  Get-ChildItem -Recurse tmp\coverage-artifact-fresh | Select-Object FullName, Length
}
