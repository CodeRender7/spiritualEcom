# repo-watcher.ps1 — Task Scheduler entry point for the autonomous driver (ticket 03).
#
# Scheduler (ticket 03): Windows Task Scheduler runs this every N minutes.
#   schtasks /Create /TN "DivineKart\AutonomousDriver" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\path\to\repo-watcher.ps1 -Sweep" /SC MINUTE /MO 30
# Manual trigger:  pnpm agent:run --once   (or run this script with -Sweep)
# Dry-run:         -DryRun switch
#
# Kill switch:     $env:AUTONOMOUS_ENABLED = "0"  → driver refuses to run (ticket 03 safety).
[CmdletBinding()]
param(
  [switch]$Sweep,      # run one sweep (default)
  [switch]$Loop,       # long-running loop (alternative to Task Scheduler)
  [switch]$DryRun      # discovery + triage only, no dispatch
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # project root
$driver = Join-Path $root ".agents\autonomous\driver.mjs"

if ($env:AUTONOMOUS_ENABLED -eq "0") {
  Write-Warning "AUTONOMOUS_ENABLED=0 — autonomous driver disabled (kill switch)."
  exit 0
}

if (-not (Test-Path -LiteralPath $driver)) {
  Write-Error "driver not found: $driver"
  exit 1
}

# Use the real exe path to avoid the .ps1 shim ANSI mangling (research 02 §1).
$exe = Join-Path $env:APPDATA "npm\node_modules\opencode-ai\bin\opencode.exe"
if (-not (Test-Path -LiteralPath $exe)) { $exe = "opencode" }

Write-Host "[watcher] root=$root"
if ($DryRun) {
  & node $driver run --dry-run
} elseif ($Loop) {
  & node $driver run --loop
} else {
  & node $driver run --once
}
exit $LASTEXITCODE