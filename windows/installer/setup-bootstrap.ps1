[CmdletBinding()]
param(
  [switch]$Install,
  [switch]$LaunchTray,
  [switch]$ShowWindow,
  [switch]$Uninstall,
  [switch]$Silent
)

$ErrorActionPreference = 'Stop'
$payloadRoot = Join-Path $PSScriptRoot 'payload'
$payloadScripts = Join-Path $payloadRoot 'scripts'
$commonPath = Join-Path $payloadScripts 'common-windows.ps1'
$themePath = Join-Path $payloadScripts 'theme-windows.ps1'
$stateRoot = Join-Path $env:LOCALAPPDATA 'YouMingHua'
$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) '又茗花.lnk'
$managerMaintenance = $null

function Show-DreamSkinBootstrapMessage {
  param(
    [Parameter(Mandatory = $true)][string]$Message,
    [ValidateSet('Info', 'Error')][string]$Kind = 'Info'
  )
  if ($Silent) { return }
  Add-Type -AssemblyName System.Windows.Forms
  $icon = if ($Kind -eq 'Error') {
    [System.Windows.Forms.MessageBoxIcon]::Error
  } else {
    [System.Windows.Forms.MessageBoxIcon]::Information
  }
  [void][System.Windows.Forms.MessageBox]::Show(
    $Message,
    '又茗花',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    $icon
  )
}

function Wait-DreamSkinCodexClosedForSetup {
  while ($true) {
    $registered = @(Get-DreamSkinRegisteredCodexInstalls)
    $running = @($registered | Where-Object { (Get-DreamSkinCodexProcesses -Codex $_).Count -gt 0 })
    if ($running.Count -eq 0) { return }
    if ($Silent) { throw 'Close Codex before installing or updating 又茗花.' }
    Add-Type -AssemblyName System.Windows.Forms
    $choice = [System.Windows.Forms.MessageBox]::Show(
      'Codex is currently running. Close it, then click Retry to continue setup.',
      '又茗花 Setup',
      [System.Windows.Forms.MessageBoxButtons]::RetryCancel,
      [System.Windows.Forms.MessageBoxIcon]::Information
    )
    if ($choice -ne [System.Windows.Forms.DialogResult]::Retry) {
      throw 'Setup was cancelled because Codex is still running.'
    }
  }
}

try {
  if ($Install -and ($LaunchTray -or $Uninstall)) {
    throw 'Choose exactly one installer bootstrap action.'
  }
  if (-not (Test-Path -LiteralPath $commonPath -PathType Leaf) -or
    -not (Test-Path -LiteralPath $themePath -PathType Leaf)) {
    throw 'The installer payload is incomplete.'
  }
  . $commonPath
  . $themePath

  $engine = Get-DreamSkinRuntimeEnginePaths -StateRoot $stateRoot
  if ($Uninstall) {
    Stop-DreamSkinTrayProcess -ScriptPaths @($engine.Tray) -RequireStopped
    Stop-DreamSkinThemeManagerProcess -StateRoot $stateRoot
    $managerMaintenance = Enter-DreamSkinThemeManagerMaintenance
    $restoreRequired = (Test-Path -LiteralPath $engine.Root -PathType Container) -or
      (Test-Path -LiteralPath (Join-Path $stateRoot 'config.before-dream-skin.toml') -PathType Leaf)
    if ($restoreRequired -and -not (Test-Path -LiteralPath $engine.Restore -PathType Leaf)) {
      throw 'The installed restore engine is missing. Reinstall 又茗花, then uninstall again so Codex can be restored safely.'
    }
    if ($restoreRequired) {
      $restoreParameters = @{
        Uninstall = $true
        ForceRestart = $true
        NoRelaunch = $true
      }
      if (Test-Path -LiteralPath (Join-Path $stateRoot 'config.before-dream-skin.toml') -PathType Leaf) {
        $restoreParameters.RestoreBaseTheme = $true
      }
      & $engine.Restore @restoreParameters
    }
    if (Test-Path -LiteralPath $engine.Root -PathType Container) {
      Remove-DreamSkinRuntimeTree -Path $engine.Root -StateRoot $stateRoot
    }
    Remove-Item -LiteralPath $startupShortcut -Force -ErrorAction SilentlyContinue
    exit 0
  }

  $payloadNode = Join-Path $payloadRoot 'runtime\node\node.exe'
  $payloadNodeLicense = Join-Path $payloadRoot 'runtime\node\LICENSE'
  if (-not (Test-Path -LiteralPath $payloadNode -PathType Leaf) -or
    -not (Test-Path -LiteralPath $payloadNodeLicense -PathType Leaf)) {
    throw 'The installer payload is missing its bundled Node.js runtime. Re-download Setup.exe.'
  }
  $payloadVersion = ([System.IO.File]::ReadAllText((Join-Path $payloadRoot 'VERSION'))).Trim()
  if ($payloadVersion -cnotmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
    throw "The installer payload version is invalid: $payloadVersion"
  }
  $installedVersion = if (Test-Path -LiteralPath $engine.Version -PathType Leaf) {
    ([System.IO.File]::ReadAllText($engine.Version)).Trim()
  } else { '' }
  if ($installedVersion -cmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' -and
    ([version]$installedVersion) -gt ([version]$payloadVersion)) {
    throw "A newer 又茗花 v$installedVersion is already installed. Download that version or newer instead of downgrading to v$payloadVersion."
  }
  $payloadDistribution = ([System.IO.File]::ReadAllText((Join-Path $payloadRoot 'DISTRIBUTION_VERSION'))).Trim()
  if ($payloadDistribution -cnotmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
    throw 'The installer distribution version is invalid.'
  }
  $installedDistributionPath = Join-Path $engine.Root 'DISTRIBUTION_VERSION'
  $installedDistribution = if (Test-Path -LiteralPath $installedDistributionPath -PathType Leaf) {
    ([System.IO.File]::ReadAllText($installedDistributionPath)).Trim()
  } else { '' }
  if ($installedDistribution -cmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' -and
    ([version]$installedDistribution) -gt ([version]$payloadDistribution)) {
    throw "A newer 又茗花 distribution v$installedDistribution is already installed."
  }
  $backupExists = Test-Path -LiteralPath (Join-Path $stateRoot 'config.before-dream-skin.toml') -PathType Leaf
  $requiredEngineFiles = @(
    'VERSION',
    'DISTRIBUTION_VERSION',
    'assets\codex-dream-skin.ico',
    'assets\background.png',
    'assets\dream-skin.css',
    'assets\renderer-inject.js',
    'assets\safe-css-policy.json',
    'assets\safe-css-validator.mjs',
    'assets\selectors.json',
    'assets\theme-package-validator.mjs',
    'assets\theme.json',
    'assets\theme.css',
    'presets\preset-youminghua\background.png',
    'presets\preset-youminghua\theme.json',
    'presets\preset-youminghua\theme.css',
    'scripts\apply-community-theme.ps1',
    'scripts\check-update.ps1',
    'scripts\common-windows.ps1',
    'scripts\config-utf8.ps1',
    'scripts\image-metadata.mjs',
    'scripts\injector.mjs',
    'scripts\install-dream-skin.ps1',
    'scripts\localization-windows.ps1',
    'scripts\restore-dream-skin.ps1',
    'scripts\start-dream-skin.ps1',
    'scripts\theme-windows.ps1',
    'assets\theme-manager\DreamSkin.ThemeManager.exe',
    'scripts\tray-dream-skin.ps1',
    'scripts\validate-safe-css-file.mjs',
    'scripts\verify-dream-skin.ps1',
    'runtime\node\node.exe',
    'runtime\node\LICENSE'
  )
  $missingEngineFiles = @($requiredEngineFiles | Where-Object {
    -not (Test-Path -LiteralPath (Join-Path $engine.Root $_) -PathType Leaf)
  })
  $engineComplete = $missingEngineFiles.Count -eq 0
  $needsInstall = $Install -or $payloadVersion -cne $installedVersion -or
    $payloadDistribution -cne $installedDistribution -or
    -not $backupExists -or -not $engineComplete

  if ($needsInstall) {
    Wait-DreamSkinCodexClosedForSetup
    Stop-DreamSkinTrayProcess -ScriptPaths @($engine.Tray) -RequireStopped
    # Close before install acquires Operation: FormClosing must be able to
    # acquire that lock itself to save a pending transparency adjustment.
    Stop-DreamSkinThemeManagerProcess -StateRoot $stateRoot
    & (Join-Path $payloadScripts 'install-dream-skin.ps1') -NoShortcuts
    $engine = Get-DreamSkinRuntimeEnginePaths -StateRoot $stateRoot
    $committedVersion = if (Test-Path -LiteralPath $engine.Version -PathType Leaf) {
      ([System.IO.File]::ReadAllText($engine.Version)).Trim()
    } else { '' }
    $missingEngineFiles = @($requiredEngineFiles | Where-Object {
      -not (Test-Path -LiteralPath (Join-Path $engine.Root $_) -PathType Leaf)
    })
    $committedDistribution = ([System.IO.File]::ReadAllText((Join-Path $engine.Root 'DISTRIBUTION_VERSION'))).Trim()
    if ($committedDistribution -cne $payloadDistribution -or
      $committedVersion -cne $payloadVersion -or $missingEngineFiles.Count -gt 0 -or
      -not (Test-Path -LiteralPath (Join-Path $stateRoot 'config.before-dream-skin.toml') -PathType Leaf)) {
      throw 'Runtime installation did not commit a complete managed engine.'
    }
  }

  if ($LaunchTray) {
    $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $argumentLine = '-NoProfile -STA -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File ' +
      (ConvertTo-DreamSkinProcessArgument -Value $engine.Tray)
    if ($ShowWindow) { $argumentLine += ' -ShowWindow' }
    Start-Process -FilePath $powershell -ArgumentList $argumentLine -WindowStyle Hidden | Out-Null
  }
} catch {
  Show-DreamSkinBootstrapMessage -Message $_.Exception.Message -Kind Error
  Write-Error $_
  exit 1
} finally {
  if ($null -ne $managerMaintenance) {
    $managerMaintenance.ReleaseMutex()
    $managerMaintenance.Dispose()
  }
}
