$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$repositoryUrl = 'https://github.com/Vixxha/Proyecto_integrado.git'

function Invoke-Checked {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló $Command (código $LASTEXITCODE). No se continuará con la subida." }
}

# Git portátil oficial, dentro de output/ (excluido del repositorio).
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
if ($gitCommand) {
  $gitExe = $gitCommand.Source
} else {
  $toolsDirectory = Join-Path (Get-Location) 'output\tools'
  $gitDirectory = Join-Path $toolsDirectory 'mingit'
  $gitExe = Join-Path $gitDirectory 'cmd\git.exe'
  if (!(Test-Path -LiteralPath $gitExe)) {
    Write-Host 'Descargando Git portátil desde git-for-windows/git...'
    $release = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest'
    $assets = @($release.assets | Where-Object { $_.name -match '^MinGit-[0-9]+(?:\.[0-9]+)*-64-bit\.zip$' })
    if ($assets.Count -ne 1) {
      $availableNames = ($release.assets | ForEach-Object { $_.name }) -join ', '
      throw "No se identificó una única distribución oficial de MinGit x64. Archivos disponibles: $availableNames"
    }
    Write-Host "Distribución seleccionada: $($assets[0].name)"
    New-Item -ItemType Directory -Force -Path $toolsDirectory | Out-Null
    $archive = Join-Path $toolsDirectory $assets[0].name
    Invoke-WebRequest -UseBasicParsing -Uri $assets[0].browser_download_url -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $gitDirectory -Force
  }
}
$env:PATH = "$(Split-Path $gitExe -Parent);$env:PATH"
Invoke-Checked $gitExe @('--version')

if (!(Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Falta GitHub CLI (gh). Instálalo desde cli.github.com y vuelve a ejecutar este script.' }
& gh auth status --hostname github.com
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Completa el inicio de sesión de GitHub en tu navegador.'
  Invoke-Checked 'gh' @('auth','login','--hostname','github.com','--git-protocol','https','--web')
}
$profileJson = & gh api user
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar la cuenta de GitHub.' }
$profile = $profileJson | ConvertFrom-Json
if ($profile.login -ne 'Vixxha') { throw "La cuenta activa es $($profile.login). Inicia sesión como Vixxha antes de continuar." }

# La instalación completa actualiza el lockfile pendiente de ExcelJS y Supabase.
Invoke-Checked 'npm.cmd' @('install','--no-audit','--no-fund')
Invoke-Checked 'npm.cmd' @('run','test:data')
Invoke-Checked 'npm.cmd' @('test')
Invoke-Checked 'npm.cmd' @('run','build')
Invoke-Checked 'npx.cmd' @('playwright','install','chromium')
Invoke-Checked 'npm.cmd' @('run','test:e2e')

if (!(Test-Path -LiteralPath '.git')) { Invoke-Checked $gitExe @('init','-b','main') }
$branch = & $gitExe branch --show-current
if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw 'La rama actual no es main. Revisa el repositorio local antes de subir.' }
$remotes = & $gitExe remote
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron consultar los remotos.' }
if ($remotes -contains 'origin') {
  $currentRemote = & $gitExe remote get-url origin
  if ($LASTEXITCODE -ne 0 -or $currentRemote -ne $repositoryUrl) { throw 'origin apunta a otro destino. No se ha modificado.' }
} else {
  Invoke-Checked $gitExe @('remote','add','origin',$repositoryUrl)
}

# Ajustes locales a este repositorio; no cambian la identidad global.
$authorName = if ($profile.name) { $profile.name } else { $profile.login }
Invoke-Checked $gitExe @('config','user.name',$authorName)
Invoke-Checked $gitExe @('config','user.email',"$($profile.id)+$($profile.login)@users.noreply.github.com")
Invoke-Checked $gitExe @('config','--replace-all','credential.https://github.com.helper','!gh auth git-credential')

Invoke-Checked $gitExe @('add','--','.gitignore','.nvmrc','.github','README.md','package.json','package-lock.json','netlify.toml','index.html','components.json','playwright.config.ts','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vite.config.ts','src','public','scripts','tests','supabase','docs')
& $gitExe diff --cached --quiet
$diffStatus = $LASTEXITCODE
if ($diffStatus -eq 1) {
  Invoke-Checked $gitExe @('commit','-m','Publish Navidad La Florida application')
} elseif ($diffStatus -ne 0) {
  throw 'No se pudieron comprobar los cambios preparados.'
}
# Sin force: Git rechazará una subida que sobrescriba historia remota.
Invoke-Checked $gitExe @('push','-u','origin','main')
$localHead = & $gitExe rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el commit local.' }
$remoteHead = & $gitExe ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0 -or !($remoteHead -match "^$localHead\s")) { throw 'No se pudo confirmar que GitHub recibió el commit local.' }
Write-Host "Subida verificada: https://github.com/Vixxha/Proyecto_integrado/commit/$localHead"
Write-Host 'Siguiente paso: importar este repositorio en Netlify con npm run build y salida dist.'
