$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
$Url = "http://localhost:3000"
$Evidencias = Join-Path $Raiz "evidencias"
$ArchivoEvidencia = Join-Path $Evidencias "CP-06-persistencia.txt"

New-Item -ItemType Directory -Force $Evidencias | Out-Null
Start-Transcript -Path $ArchivoEvidencia -Force

function Esperar-Estado($Ruta, $Esperado, $Segundos = 120) {
    $Limite = (Get-Date).AddSeconds($Segundos)

    do {
        try {
            $Respuesta = Invoke-WebRequest `
                -Uri "$Url$Ruta" `
                -UseBasicParsing `
                -TimeoutSec 5

            if ([int]$Respuesta.StatusCode -eq $Esperado) {
                return
            }
        } catch {
            if ($_.Exception.Response) {
                $Codigo = [int]$_.Exception.Response.StatusCode
                if ($Codigo -eq $Esperado) {
                    return
                }
            }
        }

        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $Limite)

    throw "No se obtuvo HTTP $Esperado en $Ruta."
}

try {
    Set-Location $Raiz

    Write-Output "CP-06: creando producto antes de recrear contenedores."

    Esperar-Estado "/health" 200

    $Nombre = "CP-06-Persistencia-$([guid]::NewGuid().ToString('N'))"
    $Cuerpo = @{
        nombre = $Nombre
        precio = 35000
    } | ConvertTo-Json

    $Creado = Invoke-RestMethod `
        -Uri "$Url/productos" `
        -Method Post `
        -ContentType "application/json" `
        -Body $Cuerpo

    if (-not $Creado.id) {
        throw "La API no devolvió el ID del producto."
    }

    $Id = $Creado.id
    Write-Output "Producto creado: ID=$Id, nombre=$Nombre"

    Write-Output "Deteniendo y recreando contenedores SIN eliminar el volumen."
    docker compose down
    if ($LASTEXITCODE -ne 0) { throw "Falló docker compose down." }

    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "Falló docker compose up -d." }

    Esperar-Estado "/health" 200

    $Recuperado = Invoke-RestMethod -Uri "$Url/productos/$Id"

    if ($Recuperado.nombre -ne $Nombre) {
        throw "El nombre recuperado no coincide."
    }

    if ([double]$Recuperado.precio -ne 35000) {
        throw "El precio recuperado no coincide."
    }

    Write-Output "RESULTADO: APROBADO"
    Write-Output "El producto ID=$Id sobrevivió a la recreación de los contenedores."
} catch {
    Write-Output "RESULTADO: FALLIDO"
    Write-Output $_
    throw
} finally {
    Stop-Transcript
}