param(
  [string]$Tag = ''
)
$token = gh auth token
if (-not $token) { Write-Error 'gh auth token not available'; exit 1 }
try {
  $releases = Invoke-RestMethod -Headers @{ Authorization = "token $token" } -Uri "https://api.github.com/repos/Wertoquri/ARCHGUARD/releases" -Method Get
  if ($Tag) {
    $r = $releases | Where-Object { $_.tag_name -eq $Tag }
  } else {
    # Prefer release that contains our uploaded asset
    $r = $releases | Where-Object { $_.assets -ne $null -and ($_.assets | Where-Object { $_.name -eq 'coverage-ui-22279786023.tar.gz' }) } | Select-Object -First 1
    if (-not $r) {
      # fallback to any release with name starting with coverage-snapshot
      $r = $releases | Where-Object { $_.name -like 'coverage-snapshot*' } | Select-Object -First 1
    }
  }
  if (-not $r) { Write-Error 'No matching release found'; exit 3 }
  $url = $r.html_url
  Write-Output $url
  Start-Process $url
} catch {
  Write-Error "Failed to open release: $_"
  exit 2
}
