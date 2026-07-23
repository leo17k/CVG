<#
clean_tablespace.ps1
Respalda y limpia el tablespace (.ibd/.frm) para una tabla en Windows
Uso: ejecutar con PowerShell (administrador). Te pedirá la contraseña MySQL.
#>

param(
  [string]$MySqlUser = 'root',
  [string]$MySqlHost = 'localhost',
  [string]$DbName = 'cvg',
  [string]$TableName = 'categorias',
  [string]$SqlFile = '',
  [string]$BackupDir = ''
)

Set-StrictMode -Version Latest

if (-not $BackupDir) { $BackupDir = Join-Path $PSScriptRoot '..\backups' }
if (-not $SqlFile) { $SqlFile = Join-Path $BackupDir 'CVG_Backup_2026-06-02T14-47-36-117Z.sql' }

function Read-PlainPassword {
    param([string]$Prompt = "MySQL root password (input hidden)")
    $secure = Read-Host $Prompt -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    return $plain
}

Write-Host "Script: limpiar tablespace para tabla '$TableName' en BD '$DbName'."

if (!(Get-Command mysql -ErrorAction SilentlyContinue)) {
    Write-Error "No se encontró el cliente 'mysql' en PATH. Instala MySQL client o añadelo al PATH."
    exit 1
}

$pw = Read-PlainPassword

# Obtener datadir
try {
    $datadir = & mysql -u $MySqlUser -p"$pw" -h $MySqlHost -N -e "SELECT @@datadir;" 2>$null | Select-Object -First 1
    if (-not $datadir) { throw "datadir vacío" }
    $datadir = $datadir.Trim()
} catch {
    Write-Warning "No se pudo obtener @@datadir via cliente mysql: $_. Intentando rutas comunes..."
    $candidates = @(
        'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\data',
        'C:\\ProgramData\\MySQL\\MySQL Server 5.7\\data',
        'C:\\Program Files\\MySQL\\MySQL Server 8.0\\data',
        'C:\\Program Files\\MySQL\\MySQL Server 5.7\\data'
    )
    $datadir = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $datadir) {
        Write-Error "No se pudo determinar datadir. Por favor indica la ruta de datos de MySQL y reintenta."
        exit 1
    }
}

Write-Host "datadir detectado: $datadir"

$ibdPath = Join-Path $datadir "$DbName\$TableName.ibd"
$frmPath = Join-Path $datadir "$DbName\$TableName.frm"

Write-Host "Comprobando existencia de archivos:`n - $ibdPath`n - $frmPath"

$ibdExists = Test-Path $ibdPath
$frmExists = Test-Path $frmPath

# Comprobar si la tabla existe en el diccionario de datos
try {
    $tblCountRaw = & mysql -u $MySqlUser -p"$pw" -h $MySqlHost -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DbName' AND table_name='$TableName';" 2>$null
    $tblCount = if ($tblCountRaw) { [int]($tblCountRaw.Trim()) } else { 0 }
} catch {
    Write-Warning "No se pudo verificar existencia de tabla via mysql: $_. Asumiremos que la tabla puede no existir."
    $tblCount = 0
}

Write-Host "Tabla presente en information_schema?: $([bool]($tblCount -gt 0))"

# Crear backup de archivos .ibd/.frm si existen
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFolder = (Resolve-Path -Path $BackupDir -ErrorAction SilentlyContinue).Path
if (-not $backupFolder) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null; $backupFolder = (Resolve-Path -Path $BackupDir).Path }
$backupIbd = Join-Path $backupFolder "$TableName.ibd.bak.$timestamp"
$backupFrm = Join-Path $backupFolder "$TableName.frm.bak.$timestamp"

if ($ibdExists) {
    Write-Host "Creando copia de seguridad de $ibdPath → $backupIbd"
    try { Copy-Item -Path $ibdPath -Destination $backupIbd -Force -ErrorAction Stop; Write-Host "Copia .ibd creada." } catch { Write-Warning "Error copiando .ibd: $_" }
}
if ($frmExists) {
    Write-Host "Creando copia de seguridad de $frmPath → $backupFrm"
    try { Copy-Item -Path $frmPath -Destination $backupFrm -Force -ErrorAction Stop; Write-Host "Copia .frm creada." } catch { Write-Warning "Error copiando .frm: $_" }
}

# Si la tabla existe, intentar DISCARD TABLESPACE
if ($tblCount -gt 0) {
    Write-Host "La tabla existe en el servidor. Intentando 'ALTER TABLE ... DISCARD TABLESPACE'..."
    try {
        & mysql -u $MySqlUser -p"$pw" -h $MySqlHost -e "USE \`$DbName\`; ALTER TABLE \`$TableName\` DISCARD TABLESPACE;" 2>$null
        Write-Host "Comando DISCARD TABLESPACE enviado. Comprobaré si el .ibd sigue presente."
        Start-Sleep -Seconds 2
        if (Test-Path $ibdPath) {
            Write-Warning ".ibd aún presente. Intentaré moverlo (puede requerir detener el servicio si está en uso)."
            try {
                $dest = Join-Path $backupFolder ([IO.Path]::GetFileName($backupIbd))
                Move-Item -Path $ibdPath -Destination $dest -Force -ErrorAction Stop
                Write-Host "Movido $ibdPath → $dest"
            } catch {
                Write-Warning "No se pudo mover .ibd mientras el servicio está en ejecución: $_"
                # intentar detener servicio
                $svc = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 1
                if ($null -ne $svc) {
                    Write-Host "Deteniendo servicio MySQL '$($svc.Name)' para mover archivos..."
                    Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                    try { Move-Item -Path $ibdPath -Destination $dest -Force -ErrorAction Stop; Write-Host "Movido $ibdPath → $dest" } catch { Write-Error "Falló mover .ibd aun tras detener servicio: $_" }
                    Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
                } else {
                    Write-Error "No encontré servicio MySQL corriendo. Debes mover manualmente $ibdPath."
                }
            }
        } else {
            Write-Host ".ibd eliminado por DISCARD o no existía."
        }
    } catch {
        Write-Warning "Fallo DISCARD TABLESPACE: $_"
        Write-Host "Procediendo a detener servicio y mover .ibd manualmente (si existe)."
        $svc = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 1
        if ($null -ne $svc) {
            Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            try {
                if (Test-Path $ibdPath) { Move-Item -Path $ibdPath -Destination $backupIbd -Force -ErrorAction Stop; Write-Host "Movido $ibdPath → $backupIbd" }
                if (Test-Path $frmPath) { Move-Item -Path $frmPath -Destination $backupFrm -Force -ErrorAction Stop; Write-Host "Movido $frmPath → $backupFrm" }
            } catch { Write-Error "Error moviendo archivos: $_" }
            Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
        } else {
            Write-Error "No hay servicio MySQL corriendo y no pude ejecutar DISCARD. Mueve manualmente los archivos."
        }
    }
} else {
    # tabla no existe en metadata: detener servicio, mover archivos
    if ($ibdExists -or $frmExists) {
        Write-Host "La tabla no existe en el diccionario. Detendré MySQL y moveré los archivos físicos (se creó respaldo arriba)."
        $svc = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 1
        if ($null -ne $svc) {
            Write-Host "Deteniendo servicio MySQL '$($svc.Name)'..."
            Stop-Service -Name $svc.Name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            try {
                if (Test-Path $ibdPath) { Move-Item -Path $ibdPath -Destination $backupIbd -Force -ErrorAction Stop; Write-Host "Movido $ibdPath → $backupIbd" }
                if (Test-Path $frmPath) { Move-Item -Path $frmPath -Destination $backupFrm -Force -ErrorAction Stop; Write-Host "Movido $frmPath → $backupFrm" }
            } catch { Write-Error "Error moviendo archivos: $_" }
            Start-Service -Name $svc.Name -ErrorAction SilentlyContinue
        } else {
            Write-Error "No se detectó servicio MySQL corriendo. Mueve manualmente $ibdPath y $frmPath a una carpeta de respaldo y reintenta la importación."
            exit 1
        }
    } else {
        Write-Host "No hay archivos .ibd/.frm para mover."
    }
}

# Reintentar import si se proporcionó archivo SQL
if ($SqlFile -and (Test-Path $SqlFile)) {
    Write-Host "Reintentando importación desde: $SqlFile"
    $cmd = "mysql -u $MySqlUser -p`"$pw`" -h $MySqlHost $DbName < `"$SqlFile`""
    Write-Host "Ejecutando: $cmd"
    cmd.exe /c $cmd
    Write-Host "Importación intentada. Revisa la salida por errores."
} else {
    Write-Warning "No se encontró el archivo SQL para reimportar: $SqlFile"
}

Write-Host "Script completado. Revisa backups en: $backupFolder"
