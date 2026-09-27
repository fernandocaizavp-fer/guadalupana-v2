# -*- coding: utf-8 -*-
"""
Análisis de resultados JMeter + PerfMon para la evaluación de eficiencia de
desempeño (ISO/IEC 25010) del backend del CF Guadalupana.

Empareja, por marca de tiempo, cada petición HTTP (tiempo de respuesta) con su
medición de RAM y CPU del proceso del servidor (medido por PID con PerfMon), y
produce:
  1) Una tabla final CSV:  No. Petición | Tiempo (ms) | RAM (MB) | CPU (%)
  2) Un resumen estadístico por métrica: media, desv. estándar, mín, máx, n.

USO (desde la carpeta del proyecto, con Python 3):
    python jmeter/analizar_perfmon.py calificaciones
    python jmeter/analizar_perfmon.py matricula
    python jmeter/analizar_perfmon.py asistencia

Requiere, en la carpeta jmeter/, los dos CSV que genera cada corrida:
    resultados_<proceso>.csv   (muestras HTTP: timeStamp, elapsed, label, ...)
    perfmon_<proceso>.csv      (métricas PerfMon: filas Memory y CPU)

Sin dependencias externas (solo biblioteca estándar).
"""

import csv
import os
import statistics
import sys

# Carpeta donde viven los CSV (la misma de este script).
BASE = os.path.dirname(os.path.abspath(__file__))

BYTES_POR_MB = 1048576  # 1 MiB = 1024 * 1024 bytes

# --- Factor de calibración de CPU (ajustar tras comparar con el Administrador de Tareas) ---
# PerfMon en Windows reporta la CPU por proceso en MILI-PORCENTAJE: el valor 15515
# equivale a ~15,5 %. Se divide entre 1000 para obtener el porcentaje real (0-100).
# Calibra: si PerfMon marca 15515 y el Administrador de Tareas muestra ~15 %, deja 1000.
CPU_DIVISOR = 1000.0


def _leer_jtl(ruta):
    """Lee un CSV de JMeter (JTL) y devuelve la lista de filas como dicts."""
    if not os.path.exists(ruta):
        raise SystemExit(f"[ERROR] No se encontró el archivo: {ruta}")
    with open(ruta, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _num(valor):
    """Convierte a float tolerando coma decimal y vacíos."""
    if valor is None or valor == "":
        return None
    try:
        return float(str(valor).replace(",", "."))
    except ValueError:
        return None


def cargar_http(proceso):
    """Filas de peticiones HTTP: (timeStamp_ms, tiempo_respuesta_ms)."""
    filas = _leer_jtl(os.path.join(BASE, f"resultados_{proceso}.csv"))
    http = []
    for r in filas:
        label = (r.get("label") or "")
        # Descartar filas PerfMon que pudieran haberse mezclado en el mismo log.
        if "Memory" in label or "CPU" in label:
            continue
        ts = _num(r.get("timeStamp"))
        elapsed = _num(r.get("elapsed"))
        exito = (r.get("success") or "").strip().lower() == "true"
        if ts is None or elapsed is None:
            continue
        http.append({"ts": int(ts), "ms": elapsed, "ok": exito})
    return http


def cargar_perfmon(proceso):
    """
    Devuelve dos listas de (timeStamp_ms, valor):
      - memoria en MB (bytes / 1048576)
      - cpu en % (tal como lo reporta PerfMon para el proceso)
    """
    filas = _leer_jtl(os.path.join(BASE, f"perfmon_{proceso}.csv"))
    memoria, cpu = [], []
    for r in filas:
        label = (r.get("label") or "")
        ts = _num(r.get("timeStamp"))
        val = _num(r.get("elapsed"))
        if ts is None or val is None:
            continue
        if "Memory" in label:
            # OJO: en Windows esto es memoria VIRTUAL (~20-30 GB), no RAM física.
            # Se conserva solo como respaldo/diagnóstico; la RAM real viene del
            # muestreador (ram_<proceso>.csv). Ver cargar_ram_muestreo().
            memoria.append((int(ts), val / BYTES_POR_MB))
        elif "CPU" in label:
            cpu.append((int(ts), val / CPU_DIVISOR))
    return memoria, cpu


def cargar_ram_muestreo(proceso):
    """
    RAM física (Working Set / RSS) del muestreador PowerShell: ram_<proceso>.csv
    con columnas timeStamp(ms),ws_bytes. Devuelve [(ts, MB), ...] o None si no existe.
    PerfMon en Windows no da bien el RSS por proceso (reporta memoria virtual), por
    eso la RAM real se toma de aquí. Ver jmeter/muestrear_ram.ps1.
    """
    ruta = os.path.join(BASE, f"ram_{proceso}.csv")
    if not os.path.exists(ruta):
        return None
    serie = []
    # utf-8-sig: PowerShell 5.1 escribe UTF-8 con BOM.
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            ts = _num(r.get("timeStamp"))
            ws = _num(r.get("ws_bytes"))
            if ts is None or ws is None:
                continue
            serie.append((int(ts), ws / BYTES_POR_MB))
    return serie or None


def _mas_cercano(ts, serie):
    """Valor de la serie [(ts, val), ...] cuyo timestamp está más cerca de ts."""
    if not serie:
        return None
    mejor = min(serie, key=lambda p: abs(p[0] - ts))
    return mejor[1]


def _stats(valores):
    """media, desv. estándar (muestral), mín, máx, n — ignorando None."""
    xs = [v for v in valores if v is not None]
    if not xs:
        return None
    return {
        "n": len(xs),
        "media": statistics.mean(xs),
        "desv": statistics.stdev(xs) if len(xs) > 1 else 0.0,
        "min": min(xs),
        "max": max(xs),
    }


def _imprimir_stats(titulo, s, unidad):
    if s is None:
        print(f"  {titulo}: sin datos")
        return
    print(
        f"  {titulo:<14} n={s['n']:<4} "
        f"media={s['media']:.2f}{unidad}  "
        f"desv={s['desv']:.2f}  "
        f"mín={s['min']:.2f}  máx={s['max']:.2f}"
    )


def analizar(proceso):
    http = cargar_http(proceso)
    memoria_virtual, cpu = cargar_perfmon(proceso)
    ram_real = cargar_ram_muestreo(proceso)
    if ram_real is not None:
        memoria = ram_real
        fuente_ram = "muestreo Working Set (RSS real)"
    else:
        memoria = memoria_virtual
        fuente_ram = "PerfMon (MEMORIA VIRTUAL, no RAM física — corre muestrear_ram.ps1)"

    print(f"\n===== Análisis: {proceso.upper()} =====")
    print(f"Peticiones HTTP leídas: {len(http)}  "
          f"(exitosas: {sum(1 for h in http if h['ok'])})")
    print(f"Muestras — RAM: {len(memoria)} [{fuente_ram}], CPU: {len(cpu)}")

    # Emparejar cada petición con la medición de RAM/CPU más cercana en el tiempo.
    filas_final = []
    for i, h in enumerate(http, start=1):
        ram = _mas_cercano(h["ts"], memoria)
        uso_cpu = _mas_cercano(h["ts"], cpu)
        filas_final.append({
            "No. Peticion": i,
            "Tiempo (ms)": round(h["ms"], 2),
            "RAM (MB)": round(ram, 2) if ram is not None else "",
            "CPU (%)": round(uso_cpu, 2) if uso_cpu is not None else "",
        })

    salida = os.path.join(BASE, f"tabla_final_{proceso}.csv")
    with open(salida, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f, fieldnames=["No. Peticion", "Tiempo (ms)", "RAM (MB)", "CPU (%)"]
        )
        w.writeheader()
        w.writerows(filas_final)
    print(f"Tabla final escrita en: {salida}")

    # Resumen estadístico.
    print("\nResumen estadístico:")
    _imprimir_stats("Tiempo (ms)", _stats([h["ms"] for h in http]), " ms")
    _imprimir_stats("RAM (MB)", _stats([m[1] for m in memoria]), " MB")
    _imprimir_stats("CPU (%)", _stats([c[1] for c in cpu]), " %")

    # Validaciones de sanidad (los errores que arruinaron la corrida anterior).
    print("\nValidaciones de sanidad:")
    ram_vals = [m[1] for m in memoria]
    cpu_vals = [c[1] for c in cpu]
    if ram_vals and max(ram_vals) > 1000:
        print(f"  [ALERTA] RAM máx = {max(ram_vals):.0f} MB (>1 GB) → es la MEMORIA "
              "VIRTUAL de PerfMon, no RAM física. Corre muestrear_ram.ps1 y genera "
              f"ram_{proceso}.csv.")
    elif ram_vals and len(set(round(v, 2) for v in ram_vals)) == 1:
        print("  [ALERTA] La RAM es CONSTANTE en todas las filas → se midió un "
              "proceso idle o el PID equivocado. Revisa el PID.")
    elif ram_vals and max(ram_vals) < 30:
        print(f"  [ALERTA] RAM máx = {max(ram_vals):.2f} MB, demasiado baja para "
              "un backend Express+Prisma → probablemente PID equivocado.")
    else:
        print("  [OK] La RAM varía y está en un rango plausible (RSS físico).")

    if cpu_vals and all(v == 0 for v in cpu_vals):
        print("  [ALERTA] La CPU es 0 en TODAS las filas → el backend no recibió "
              "carga mientras PerfMon grababa (no corrieron juntos).")
    elif cpu_vals and max(cpu_vals) > 100:
        print(f"  [ALERTA] CPU máx = {max(cpu_vals):.1f}% (>100) → revisa CPU_DIVISOR "
              "(compara PerfMon crudo contra el Administrador de Tareas).")
    else:
        print("  [OK] La CPU registra actividad y está entre 0 y 100 %.")

    fallidas = sum(1 for h in http if not h["ok"])
    if fallidas:
        print(f"  [ALERTA] {fallidas} peticiones HTTP fallaron → revisa token, "
              "endpoint o rate-limit (429). El backend no trabajó en esas.")
    else:
        print("  [OK] Todas las peticiones HTTP fueron exitosas.")


def main():
    if len(sys.argv) < 2:
        raise SystemExit(
            "Uso: python analizar_perfmon.py <proceso>\n"
            "  <proceso> = calificaciones | matricula | asistencia"
        )
    for proceso in sys.argv[1:]:
        analizar(proceso.lower())
    print()


if __name__ == "__main__":
    main()
