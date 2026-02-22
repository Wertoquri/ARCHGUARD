# Delete all local branches except 'main', then delete all remote origin branches except 'main'
$keep = 'main'
Write-Output "Keeping branch: $keep"

# Delete local branches
$locals = git for-each-ref --format='%(refname:short)' refs/heads | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne $keep }
foreach ($b in $locals) {
  Write-Output "Deleting local branch: $b"
  git branch -D $b
}

# Delete remote branches under origin (skip origin/main and origin/HEAD)
$remotes = git for-each-ref --format='%(refname:short)' refs/remotes | ForEach-Object { $_.Trim() } | Where-Object { $_ -like 'origin/*' -and $_ -ne 'origin/main' -and $_ -ne 'origin/HEAD' }
foreach ($r in $remotes) {
  $bn = $r -replace '^origin/',''
  Write-Output "Deleting remote branch: origin/$bn"
  git push origin --delete $bn
}
