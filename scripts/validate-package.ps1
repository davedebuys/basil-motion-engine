[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$engineRoot = Join-Path $repoRoot 'hermes-overlay\apps\desktop\src\basil-motion'
$patchPath = Join-Path $repoRoot 'patches\hermes-agent-f4df260f.patch'

$required = @(
  'README.md',
  'LICENSE',
  'docs\BASIL_MOTION.md',
  'docs\INTEGRATION.md',
  'hermes-overlay\apps\desktop\src\basil-motion\engine.ts',
  'hermes-overlay\apps\desktop\src\basil-motion\types.ts',
  'hermes-overlay\apps\desktop\src\basil-motion\basil-orb.tsx',
  'hermes-overlay\apps\desktop\src\basil-motion\interaction-pack.ts',
  'hermes-overlay\apps\desktop\src\basil-motion\personality-pack.ts',
  'hermes-overlay\apps\desktop\src\basil-motion\presence-audio-engine.ts',
  'hermes-overlay\apps\desktop\src\basil-motion\adapters\hermes.ts',
  'hermes-overlay\apps\desktop\electron\basil-windows-uia.ts',
  'hermes-overlay\hermes_cli\basil_speech_prefilter.py',
  'patches\hermes-agent-f4df260f.patch'
)

foreach ($relativePath in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $relativePath))) {
    throw "Missing required distribution file: $relativePath"
  }
}

$engineFiles = @(Get-ChildItem -LiteralPath $engineRoot -Recurse -File)

if ($engineFiles.Count -lt 150) {
  throw "Engine file count is unexpectedly low: $($engineFiles.Count)"
}

$interactionSource = Get-Content -Raw -LiteralPath (Join-Path $engineRoot 'interaction-pack.ts')
$personalitySource = Get-Content -Raw -LiteralPath (Join-Path $engineRoot 'personality-pack.ts')

if (([regex]::Matches($interactionSource, "\[\s*'[^']+'\s*,\s*'[^']+'")).Count -ne 100) {
  throw 'The interaction pack does not contain exactly 100 authored interactions.'
}

if (([regex]::Matches($personalitySource, "id: '")).Count -ne 20) {
  throw 'The personality pack does not contain exactly 20 authored behaviours.'
}

if (Select-String -LiteralPath $patchPath -Pattern 'HERMES_ONE_MODEL_LIBRARY_COMPAT' -Quiet) {
  throw 'The distribution patch contains unrelated Hermes One changes.'
}

$forbiddenPaths = @('hermes_cli\web_server.py.orig', 'tinker-atropos', 'web\scripts')

foreach ($relativePath in $forbiddenPaths) {
  if (Test-Path -LiteralPath (Join-Path $repoRoot $relativePath)) {
    throw "Unrelated source was packaged: $relativePath"
  }
}

Write-Host "Basil package validation passed: $($engineFiles.Count) engine files, 100 interactions, 20 behaviours."
