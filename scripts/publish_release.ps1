param(
  [string]$Tag = 'untagged-d810a3733333b7d912ee'
)
$token = gh auth token
if (-not $token) { Write-Error 'gh auth token not available'; exit 1 }
try {
  $r = Invoke-RestMethod -Headers @{ Authorization = "token $token" } -Uri "https://api.github.com/repos/Wertoquri/ARCHGUARD/releases/tags/$Tag" -Method Get
  $id = $r.id
  if (-not $id) { Write-Error 'Release id not found'; exit 2 }
  $body = @{ draft = $false } | ConvertTo-Json
  $updated = Invoke-RestMethod -Headers @{ Authorization = "token $token"; 'User-Agent' = 'archguard-agent' } -Uri "https://api.github.com/repos/Wertoquri/ARCHGUARD/releases/$id" -Method Patch -Body $body -ContentType 'application/json'
  Write-Output $updated.html_url
  Start-Process $updated.html_url
} catch {
  Write-Error "Failed to publish release: $_"
  exit 3
}
