[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$HermesPath,

  [switch]$Check,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$overlayRoot = Join-Path $repoRoot 'hermes-overlay'
$patchPath = Join-Path $repoRoot 'patches\hermes-agent-f4df260f.patch'
$targetRoot = (Resolve-Path -LiteralPath $HermesPath).Path

if (-not (Test-Path -LiteralPath (Join-Path $targetRoot '.git'))) {
  throw "Target is not a Git checkout: $targetRoot"
}

if (-not (Test-Path -LiteralPath (Join-Path $targetRoot 'apps\desktop\package.json'))) {
  throw "Target does not look like Hermes Agent: $targetRoot"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git is required.'
}

function Invoke-GitApply {
  param([string[]]$Arguments)

  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'

  try {
    & git -C $targetRoot @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
}

$conflicts = [System.Collections.Generic.List[string]]::new()

foreach ($sourceFile in Get-ChildItem -LiteralPath $overlayRoot -Recurse -File) {
  $relativePath = $sourceFile.FullName.Substring($overlayRoot.Length).TrimStart('\', '/')
  $targetFile = Join-Path $targetRoot $relativePath

  if (-not (Test-Path -LiteralPath $targetFile)) {
    continue
  }

  $sourceHash = (Get-FileHash -LiteralPath $sourceFile.FullName -Algorithm SHA256).Hash
  $targetHash = (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash

  if ($sourceHash -ne $targetHash -and -not $Force) {
    $conflicts.Add($relativePath)
  }
}

if ($conflicts.Count -gt 0) {
  $list = $conflicts | ForEach-Object { "  - $_" }
  throw "Overlay files already exist with different content. Review them or rerun with -Force:`n$($list -join "`n")"
}

$checkExit = Invoke-GitApply @('apply', '--check', '--whitespace=nowarn', $patchPath)

if ($checkExit -ne 0) {
  $reverseExit = Invoke-GitApply @('apply', '--reverse', '--check', '--whitespace=nowarn', $patchPath)

  if ($reverseExit -eq 0) {
    throw 'The tracked Basil patch appears to be applied already.'
  }

  throw 'The tracked Basil patch does not apply cleanly. Follow docs/INTEGRATION.md for a manual port.'
}

if ($Check) {
  Write-Host "Basil integration preflight passed for $targetRoot"
  exit 0
}

$applyExit = Invoke-GitApply @('apply', '--whitespace=nowarn', $patchPath)

if ($applyExit -ne 0) {
  throw 'Git failed while applying the tracked Basil patch.'
}

foreach ($sourceFile in Get-ChildItem -LiteralPath $overlayRoot -Recurse -File) {
  $relativePath = $sourceFile.FullName.Substring($overlayRoot.Length).TrimStart('\', '/')
  $targetFile = Join-Path $targetRoot $relativePath
  $targetDirectory = Split-Path -Parent $targetFile

  New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  Copy-Item -LiteralPath $sourceFile.FullName -Destination $targetFile -Force
}

Write-Host "Basil Motion Engine installed into $targetRoot"
Write-Host 'Next: run the validation commands in README.md.'
