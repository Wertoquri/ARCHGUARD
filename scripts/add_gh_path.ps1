$bin = 'D:\\Tools\\gh\\bin'
$old = [Environment]::GetEnvironmentVariable('Path','User') -as [string]
if (-not $old) {
  [Environment]::SetEnvironmentVariable('Path', $bin, 'User')
  Write-Output "Set user PATH to $bin"
} else {
  if ($old -notlike "*$bin*") {
    [Environment]::SetEnvironmentVariable('Path', $old + ';' + $bin, 'User')
    Write-Output "ADDED:$bin"
  } else {
    Write-Output "ALREADY_IN_PATH"
  }
}
Write-Output 'NewUserPath:'
[Environment]::GetEnvironmentVariable('Path','User')
