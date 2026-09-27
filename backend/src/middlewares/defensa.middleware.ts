import { Request, Response, NextFunction } from 'express';

const CONFIG = {
  VENTANA_MS: 60_000,
  MAX_PETICIONES: 50,
  MAX_INFRACCIONES: 3,
  DURACION_BLOQUEO_MS: 300_000
};

interface EntradaBlacklist {
  bloqueadoHasta: number;
  razon: string;
  bloqueadoEn: string;
}

interface RegistroIP {
  timestamps: number[];
  infracciones: number;
}

const requestStore = new Map<string, RegistroIP>();
const blacklist = new Map<string, EntradaBlacklist>();

export const obtenerEstado = () => {
  const ahora = Date.now();

  const ipsEnBlacklist = [];
  for (const [ip, datos] of blacklist.entries()) {
    if (ahora < datos.bloqueadoHasta) {
      ipsEnBlacklist.push({
        ip,
        bloqueadoEn: datos.bloqueadoEn,
        bloqueadaHasta: new Date(datos.bloqueadoHasta).toISOString(),
        tiempoRestante: `${Math.ceil((datos.bloqueadoHasta - ahora) / 1000)}s`,
        razon: datos.razon
      });
    }
  }

  const ipsMonitoreadas = [];
  for (const [ip, datos] of requestStore.entries()) {
    const peticionesEnVentana = datos.timestamps.filter(
      ts => ahora - ts < CONFIG.VENTANA_MS
    ).length;
    ipsMonitoreadas.push({
      ip,
      peticionesEnVentana,
      infracciones: datos.infracciones
    });
  }

  return {
    configuracion: {
      ventana: `${CONFIG.VENTANA_MS / 1000}s`,
      maxPeticiones: CONFIG.MAX_PETICIONES,
      maxInfracciones: CONFIG.MAX_INFRACCIONES,
      duracionBloqueo: `${CONFIG.DURACION_BLOQUEO_MS / 1000 / 60} min`
    },
    blacklist: ipsEnBlacklist,
    monitoreadas: ipsMonitoreadas,
    timestamp: new Date().toISOString()
  };
};

export const defensaDoS = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'desconocida';
  const ahora = Date.now();

  if (blacklist.has(ip)) {
    const entrada = blacklist.get(ip)!;
    if (ahora < entrada.bloqueadoHasta) {
      const tiempoRestante = Math.ceil((entrada.bloqueadoHasta - ahora) / 1000);
      console.log(`🛑 [BLOQUEADA 403] IP: ${ip} | Ruta: ${req.method} ${req.path} | Tiempo restante: ${tiempoRestante}s`);
      return res.status(403).json({
        error: 'Acceso denegado',
        codigo: 'IP_BLOQUEADA',
        mensaje: 'Tu IP ha sido bloqueada por comportamiento anómalo.',
        razon: entrada.razon,
        bloqueadoEn: entrada.bloqueadoEn,
        bloqueadaHasta: new Date(entrada.bloqueadoHasta).toISOString(),
        tiempoRestante: `${tiempoRestante} segundos`
      });
    } else {
      blacklist.delete(ip);
      if (requestStore.has(ip)) {
        requestStore.get(ip)!.infracciones = 0;
        requestStore.get(ip)!.timestamps = [];
      }
      console.log(`🔓 [DESBLOQUEO] IP ${ip} eliminada de la blacklist automáticamente.`);
    }
  }

  if (!requestStore.has(ip)) {
    requestStore.set(ip, { timestamps: [], infracciones: 0 });
  }
  const registro = requestStore.get(ip)!;

  registro.timestamps = registro.timestamps.filter(t => ahora - t < CONFIG.VENTANA_MS);

  const restantes = Math.max(0, CONFIG.MAX_PETICIONES - registro.timestamps.length - 1);
  const resetTime = new Date(ahora + CONFIG.VENTANA_MS).toISOString();

  if (registro.timestamps.length >= CONFIG.MAX_PETICIONES) {
    registro.infracciones += 1;

    console.log(`⚠️  [RATE LIMIT 429] IP: ${ip} | Peticiones: ${registro.timestamps.length}/${CONFIG.MAX_PETICIONES} | Infracción #${registro.infracciones} | Ruta: ${req.method} ${req.path}`);

    if (registro.infracciones >= CONFIG.MAX_INFRACCIONES) {
      blacklist.set(ip, {
        bloqueadoHasta: ahora + CONFIG.DURACION_BLOQUEO_MS,
        razon: 'Excedió el límite de peticiones repetidamente',
        bloqueadoEn: new Date(ahora).toISOString()
      });
      console.log(`🚫 [BLACKLIST] IP ${ip} BLOQUEADA por ${CONFIG.DURACION_BLOQUEO_MS / 1000 / 60} minutos.`);
      return res.status(403).json({
        error: 'IP bloqueada',
        codigo: 'BLACKLIST_ACTIVADA',
        mensaje: 'Has sido bloqueado por exceder el límite de peticiones repetidamente.',
        duracion: '5 minutos'
      });
    }

    res.setHeader('Retry-After', '60');
    res.setHeader('X-RateLimit-Limit', CONFIG.MAX_PETICIONES);
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', resetTime);

    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      codigo: 'RATE_LIMIT_EXCEDIDO',
      mensaje: 'Has excedido el límite de peticiones permitidas.',
      limite: CONFIG.MAX_PETICIONES,
      ventana: '60 segundos',
      reintentar: 'En 60 segundos',
      advertencia: `Infracción ${registro.infracciones}/${CONFIG.MAX_INFRACCIONES}. Más infracciones resultarán en bloqueo.`
    });
  }

  res.setHeader('X-RateLimit-Limit', CONFIG.MAX_PETICIONES);
  res.setHeader('X-RateLimit-Remaining', restantes);
  res.setHeader('X-RateLimit-Reset', resetTime);

  registro.timestamps.push(ahora);

  console.log(`✅ [OK] IP: ${ip} | Peticiones: ${registro.timestamps.length}/${CONFIG.MAX_PETICIONES} | Ruta: ${req.method} ${req.path}`);

  next();
};