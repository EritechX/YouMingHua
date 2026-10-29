[CmdletBinding()]
param([switch]$Json, [switch]$Interactive)
$ErrorActionPreference = 'Stop'
$engineRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'localization-windows.ps1')
$language = Resolve-DreamSkinLanguage -StateRoot (Join-Path $env:LOCALAPPDATA 'YouMingHua')
$currentText = ([System.IO.File]::ReadAllText((Join-Path $engineRoot 'DISTRIBUTION_VERSION'))).Trim()
function Get-DreamSkinUpdateText {
  param([string]$Key)
  Get-DreamSkinText -Key $Key -Language $language
}
$result = [pscustomobject]@{
  currentVersion = "v$currentText"
  latestVersion = $null
  updateAvailable = $false
  updateChannelConfigured = $false
  releaseUrl = $null
  message = (Get-DreamSkinUpdateText -Key 'ManualUpdate')
}
if ($Json) { $result | ConvertTo-Json -Compress }
if ($Interactive) {
  Add-Type -AssemblyName System.Windows.Forms
  [void][System.Windows.Forms.MessageBox]::Show(
    $result.message,
    (Get-DreamSkinUpdateText -Key 'UpdateTitle'), [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information)
}
if (-not $Json -and -not $Interactive) { Write-Host $result.message }
