<#
clean_tablespace_and_restore.ps1

Descripción:
  Script PowerShell seguro para Windows que:
   - detecta el `datadir` de MySQL (si es posible),
   - respalda archivos físicos `.ibd`/`.frm` de la tabla objetivo,
   - intenta dropear la tabla en MySQL si existe,
   - mueve/elimina el `.ibd` huérfano si es necesario,
   - ejecuta la importación del archivo .sql (usa `mysql` CLI).

Uso recomendado (desde PowerShell con privilegios adecuados):
  powershell -ExecutionPolicy Bypass -File .\Backend\scripts\clean_tablespace_and_restore.ps1 \
    -SqlFile "C:\Users\Cesar\Documents\Proyecto-SVG\Backend\backups\CVG_Backup_2026-06-02T14-47-36-117Z.sql" \
    -Table categorias -Database cvg -MySqlUser root -MySqlHost localhost -Force

Opciones:
  -SqlFile  : Ruta al .sql que quieres importar (obligatorio).
  -Table    : Nombre de la tabla que causa conflicto (por defecto: categorias).
  -Database : Base de datos objetivo (por defecto: cvg).
  -MySqlUser, -MySqlHost, -MySqlPort : datos de conexión al cliente `mysql`.
  -Datadir  : Si ya conoces el datadir, pásalo; si no, el script intentará consultarlo.
  -BackupDir: Carpeta donde se guardarán copias del .ibd/.frm (por defecto: Backend/backups).
  -MySqlPass: (opcional) contraseña para pasar en línea (si la usas, evita el prompt).
  -Force    : Ejecuta sin pedir confirmaciones interactivas (usa con cuidado).

# Aviso: el script no hace magia remota: debes ejecutarlo en tu máquina. Haz siempre una copia de seguridad.
#>

param(
  [Parameter(Mandatory=$true)][string]$SqlFile,
  [string]$Table = "categorias",
  [string]$Database = "cvg",
  [string]$MySqlUser = "root",
  [string]$MySqlHost = "localhost",
  [int]$MySqlPort = 3306,
  [string]$Datadir = "",
  [string]$BackupDir = "${PSScriptRoot}\..\backups",
  [string]$MySqlPass = "",
  [switch]$Force
)

function Run-MySqlQuery {
  param($query)
  $args = @('-u',$MySqlUser,'-h',$MySqlHost,'-P',$MySqlPort.ToString(),'-sN','-e',$query)
  if ($MySqlPass -ne '') { $args = @('-u',$MySqlUser,"-p$MySqlPass",'-h',$MySqlHost,'-P',$MySqlPort.ToString(),'-sN','-e',$query) }
  try {
    $out = & mysql @args 2>&1
    return ($out -join "`n").Trim()
  } catch {
    return $null
  }
}

function Run-MySqlImport {
  param($db, $file)
  $passFlag = $MySqlPass -ne '' ? "-p$MySqlPass" : "-p"
  $cmd = "mysql -u $MySqlUser $passFlag -h $MySqlHost -P $MySqlPort $db < \"$file\""
  Write-Host "Ejecutando import (se puede pedir contraseña):`n  $cmd"
  # Ejecutar via cmd.exe para que el operador '<' funcione correctamente
  $proc = Start-Process -FilePath cmd.exe -ArgumentList '/c', $cmd -NoNewWindow -Wait -PassThru
  return $proc.ExitCode
}

if (-not (Test-Path $SqlFile)) {
  Write-Error "No se encontró el archivo SQL: $SqlFile"
  exit 2
}

# Asegurar backup dir
$BackupDir = [System.IO.Path]::GetFullPath($BackupDir)
if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }

Write-Host "SQL: $SqlFile`nTabla: $Table   DB: $Database`nBackupDir: $BackupDir"

# Obtener datadir si no fue provisto
if (-not $Datadir -or $Datadir.Trim() -eq '') {
  Write-Host "Intentando obtener datadir desde MySQL (se pedirá contraseña si aplica)..."
  $d = Run-MySqlQuery "SELECT @@datadir;"
  if ($d) { $Datadir = $d } else { Write-Warning "No se pudo obtener datadir desde MySQL. Pasa -Datadir si lo conoces." }
}

if ($Datadir) {
  $Datadir = $Datadir.Trim()
  $Datadir = $Datadir.TrimEnd('\','/')
  $dbFolder = Join-Path $Datadir $Database
  Write-Host "Datadir detectado: $dbFolder"
} else {
  $dbFolder = $null
}

$ibdFile = $null; $frmFile = $null
if ($dbFolder -and (Test-Path $dbFolder)) {
  $ibdFile = Join-Path $dbFolder "$Table.ibd"
  $frmFile = Join-Path $dbFolder "$Table.frm"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tableBackupFolder = Join-Path $BackupDir "$Table.$timestamp"
New-Item -ItemType Directory -Path $tableBackupFolder -Force | Out-Null

if ($ibdFile -and (Test-Path $ibdFile)) {
  Write-Host "Se encontró: $ibdFile — creando copia en $tableBackupFolder"
  Copy-Item -Path $ibdFile -Destination $tableBackupFolder -Force
}
if ($frmFile -and (Test-Path $frmFile)) {
  Write-Host "Se encontró: $frmFile — creando copia en $tableBackupFolder"
  Copy-Item -Path $frmFile -Destination $tableBackupFolder -Force
}

# Comprobar si la tabla existe en MySQL
$tblExists = $false
try {
  $count = Run-MySqlQuery "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database' AND table_name='$Table';"
  if ($count -and [int]$count -gt 0) { $tblExists = $true }
} catch {}

if ($tblExists) {
  Write-Host "La tabla $Database.$Table existe en el servidor MySQL."
  if ($Force -or ((Read-Host "Ejecutar DROP TABLE IF EXISTS $Database.$Table ? (y/N)") -match '^[yY]')) {
    Write-Host "Ejecutando DROP TABLE IF EXISTS $Database.$Table..."
    $out = Run-MySqlQuery "DROP TABLE IF EXISTS \`$Database\`.\`$Table\`;"
    Write-Host "Resultado: $out"
  } else {
    Write-Host "No se ejecutó DROP. Puedes abortar (Ctrl+C) y manejar manualmente."
  }
} else {
  Write-Host "La tabla no existe en MySQL."
  if ($ibdFile -and (Test-Path $ibdFile)) {
    if ($Force -or ((Read-Host "Existe el archivo físico $ibdFile. Moverlo a la copia de seguridad? (y/N)") -match '^[yY]')) {
      $dest = Join-Path $tableBackupFolder (Split-Path $ibdFile -Leaf)
      Move-Item -Path $ibdFile -Destination $dest -Force
      Write-Host "Movido $ibdFile -> $dest"
    } else {
      Write-Warning "No movido; si no eliminas el .ibd la importación CLI podría volver a fallar."
    }
  }
}

Write-Host "Intentando importar el .sql ahora..."
$ec = Run-MySqlImport -db $Database -file $SqlFile
if ($ec -eq 0) {
  Write-Host "Importación finalizada correctamente."
  exit 0
} else {
  Write-Error "La importación falló (exit code $ec). Revisa los logs y considera ejecutar manualmente:" 
  Write-Host "  mysql -u $MySqlUser -p -h $MySqlHost $Database < \"$SqlFile\""
  exit $ec
}
