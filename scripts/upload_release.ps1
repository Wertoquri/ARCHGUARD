$tag = 'coverage-snapshot-' + (Get-Date).ToString('yyyyMMddHHmmss')
$token = gh auth token
$body = @{
  tag_name = $tag
  name = $tag
  body = 'Coverage snapshot and artifacts'
  draft = $true
  target_commitish = 'main'
} | ConvertTo-Json

$response = Invoke-RestMethod -Headers @{ Authorization = "token $token"; 'User-Agent' = 'archguard-agent' } -Uri 'https://api.github.com/repos/Wertoquri/ARCHGUARD/releases' -Method Post -Body $body -ContentType 'application/json'

$rawUpload = $response.upload_url
if ($rawUpload -is [System.Array]) { $rawUpload = $rawUpload[0] }
$uploadUrl = $rawUpload.ToString().Replace('{?name,label}','?name=' + [System.Uri]::EscapeDataString('coverage-ui-22279786023.tar.gz'))

Invoke-WebRequest -Headers @{ Authorization = "token $token"; 'User-Agent' = 'archguard-agent' } -Uri $uploadUrl -Method Post -InFile 'tmp/coverage-ui-22279786023.tar.gz' -ContentType 'application/gzip'

Write-Output "DONE_TAG=$tag"
