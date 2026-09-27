# Muestrea el Working Set (RAM fisica / RSS) real de un proceso, cada segundo,
# en paralelo a las pruebas de carga JMeter. Salida CSV: timeStamp(ms),ws_bytes.
#
# Por que existe: PerfMon (ServerAgent + SIGAR) en Windows de 64 bits NO devuelve
# bien el RSS por proceso; con ":resident" reporta la MEMORIA VIRTUAL (~20-30 GB).
# WorkingSet64 es la RAM fisica real, la misma que el Administrador de Tareas
# muestra en la columna "Memoria". Ver jmeter/analizar_perfmon.py.
#
# Uso (PowerShell, en PARALELO a JMeter, justo antes de darle Play):
#   .\jmeter\muestrear_ram.ps1 -ProcId 17244 -Segundos 180 -Salida jmeter\ram_calificaciones.csv
#
# (-ProcId es el "PID del servidor" que imprime el backend al arrancar.)

param(
  [Parameter(Mandatory = $true)][int]$ProcId,
  [int]$Segundos = 180,
  [string]$Salida = "jmeter\ram_muestreo.csv"
)

# ws_bytes    = WorkingSet64      -> RAM física residente (lo que muestra el
#                                    Administrador de Tareas; se recorta en reposo).
# private_bytes = PrivateMemorySize64 -> memoria privada comprometida (más estable,
#                                    Windows no la recorta; respaldo de contraste).
"timeStamp,ws_bytes,private_bytes" | Out-File -FilePath $Salida -Encoding utf8
Write-Host "Muestreando RAM del PID $ProcId durante $Segundos s -> $Salida"

for ($i = 0; $i -lt $Segundos; $i++) {
  $p = Get-Process -Id $ProcId -ErrorAction SilentlyContinue
  if ($null -eq $p) { Write-Host "Proceso $ProcId no encontrado. Fin."; break }
  $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  "$ts,$($p.WorkingSet64),$($p.PrivateMemorySize64)" | Out-File -FilePath $Salida -Append -Encoding utf8
  Start-Sleep -Seconds 1
}
Write-Host "Muestreo terminado: $Salida"
