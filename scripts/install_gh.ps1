$url = 'https://github.com/cli/cli/releases/download/v2.86.0/gh_2.86.0_windows_amd64.zip'
$out = 'D:\WEB\ARCHGUARD\gh_2.86.0_windows_amd64.zip'
Write-Output "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
Write-Output "Saved to $out"
if (-Not (Test-Path 'D:\Tools')) { New-Item -ItemType Directory -Path 'D:\Tools' | Out-Null }
Expand-Archive -LiteralPath $out -DestinationPath 'D:\Tools\gh' -Force
Write-Output "Extracted to D:\Tools\gh"
