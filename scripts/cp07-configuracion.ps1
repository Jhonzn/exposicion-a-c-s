$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$Url = "http://localhost:3000"
$Evidencias = Join-Path $Raiz "evidencias"
$ArchivoEvidencia = Join-Path $Evidencias "CP-07-configuracion.txt"

New-Item -ItemType Directory -Force $Evidencias | Out-Null

$ExistiaVariable = Test-Path Env:DB_PASSWORD
$ValorAnterior = $env:DB_PASSWORD

Start-Transcript -Path $ArchivoEvidencia -Force

function Obtener-Estado($Ruta) {
    try {
        $Respuesta = Invoke-WebRequest `
            -Uri "$Url$Ruta" `
            -UseBasicParsing `
            -TimeoutSec 5

        return [int]$Respuesta.StatusCode
    } catch {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }

        return 0
    }
}

function Esperar-Estado($Ruta, $Esperado, $Segundos = 90) {
    $Limite = (Get-Date).AddSeconds($Segundos)

    do {
        $Codigo = Obtener-Estado $Ruta

        if ($Codigo -eq $Esperado) {
            return
        }

        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $Limite)

    throw "No se obtuvo HTTP $Esperado en $Ruta."
}

try {
    Set-Location $Raiz

    Esperar-Estado "/health" 200

    Write-Output "Configurando temporalmente una contraseña incorrecta."
    $env:DB_PASSWORD = "clave_incorrecta_CP07"

    docker compose up -d --force-recreate api
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo recrear el contenedor API."
    }

    Esperar-Estado "/health" 503

    $EstadoProductos = Obtener-Estado "/productos"
    if ($EstadoProductos -ne 503) {
        throw "Se esperaba HTTP 503 en /productos y se obtuvo $EstadoProductos."
    }

    Write-Output "Correcto: la configuración incorrecta produce HTTP 503."

    Write-Output "Registros de la API con contraseña incorrecta:"
    $Registros = docker compose logs --no-color api 2>&1
    $Registros | Out-String | Write-Output

    if (($Registros | Out-String) -notmatch "Access denied") {
        Write-Output "Advertencia: no se encontró literalmente 'Access denied' en los registros."
        Write-Output "Revisa si la API registra el error de autenticación de MySQL."
    }

    Write-Output "Quitando la variable temporal para utilizar la configuración de .env."
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue

    docker compose up -d --force-recreate api
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo recrear la API con la configuración original."
    }

    Esperar-Estado "/health" 200

    $EstadoFinal = Obtener-Estado "/productos"
    if ($EstadoFinal -ne 200) {
        throw "La API no recuperó el acceso a productos: HTTP $EstadoFinal."
    }

    Write-Output "RESULTADO: APROBADO"
    Write-Output "La API falló con la contraseña incorrecta y se recuperó al restaurar la configuración."
} catch {
    Write-Output "RESULTADO: FALLIDO"
    Write-Output $_
    throw
} finally {
    # Si el script falla a mitad de la prueba, intenta restaurar la configuración
    # del contenedor antes de terminar.
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue

    try {
        Set-Location $Raiz
        docker compose up -d --force-recreate api
    } catch {
        Write-Output "Advertencia: verifica manualmente el estado de la API."
    }

    if ($ExistiaVariable) {
        $env:DB_PASSWORD = $ValorAnterior
    } else {
        Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
    }

    Stop-Transcript
}