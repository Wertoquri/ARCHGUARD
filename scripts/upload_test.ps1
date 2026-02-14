$client = New-Object System.Net.Http.HttpClient
$content = New-Object System.Net.Http.MultipartFormDataContent
$fs = [System.IO.File]::OpenRead('policy-packs\strict-security.yaml')
$sc = New-Object System.Net.Http.StreamContent($fs)
$sc.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/x-yaml')
$content.Add($sc, 'file', 'strict-security.yaml')
$resp = $client.PostAsync('http://localhost:5174/api/policy/packs/upload-with-version', $content).Result
$body = $resp.Content.ReadAsStringAsync().Result
Write-Output $body
