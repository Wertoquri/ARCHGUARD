Releasing dep-graph artifacts
=============================

This repository's CI can attach dependency-graph artifacts (JSON + PNG) to GitHub releases as a ZIP.

Steps to produce a draft release with artifacts:

1. Create a tag (recommended format):

```bash
git tag -a dep-graph-$(date +%Y%m%d-%H%M) -m "Dep graph artifacts"
git push origin --tags
```

Or on Windows PowerShell:

```powershell
$tag = "dep-graph-$(Get-Date -Format 'yyyyMMdd-HHmm')"
git tag -a $tag -m "Dep graph artifacts"
git push origin --tags
```

2. The CI workflow (`.github/workflows/ci.yml`) will detect the pushed tag and create a *draft* release named after the tag and upload `dep_graph_artifacts_<tag>.zip`.

3. Verify the release content at the Releases page, then publish the draft manually when ready.

Notes:
- PRs and branch runs still generate artifacts (Actions artifact `dep-graph`) but do not create releases.
- Use the manual workflow `Manual Dep-Graph Release` in Actions if you prefer a UI button to create a draft release from a chosen commit or tag.
