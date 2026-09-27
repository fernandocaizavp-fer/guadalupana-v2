import { Request, Response } from 'express';

const API_BASE = 'https://apiconsult.zampisoft.com/api/consultar';

/**
 * Consulta al proveedor de datos del Registro Civil.
 *
 * COSTO: se realiza UNA SOLA petición con full=true ($0.05). Antes existía un
 * reintento automático con full=false ($0.02) cuando el nivel Full no traía
 * nombre, lo que podía llegar a costar $0.07 por búsqueda sin que el usuario
 * lo supiera. Ese reintento fue eliminado a propósito: NO volver a añadirlo.
 */
export const consultarCedula = async (req: Request, res: Response) => {
  // req.params viene tipado como string | string[]: se normaliza antes de validar.
  const cedula = String(req.params.cedula ?? '').trim();
  const token = process.env.CEDULA_API_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Token de la API no configurado' });
  }
  if (!cedula || !/^\d{10}$/.test(cedula)) {
    return res.status(400).json({ error: 'Cédula inválida' });
  }

  // Nunca debe salir el token en una respuesta ni en un log, ni siquiera dentro
  // del texto de un error del proveedor.
  const sinToken = (texto: string) => texto.split(token).join('***');

  try {
    const url = `${API_BASE}?token=${encodeURIComponent(token)}&identificacion=${cedula}&full=true`;
    // El token se envía además como Bearer porque es la forma preferida; se
    // mantiene en el query string porque es la que el proveedor tiene
    // confirmada. Enviar ambas es inocuo y evita romper producción si el
    // proveedor ignora la cabecera.
    const respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });

    // Se lee como texto y se parsea a mano: si el proveedor devuelve algo que NO
    // es JSON (HTML de error, mantenimiento, gateway) se conserva el motivo real
    // en lugar de un 500 opaco.
    const texto = await respuesta.text();
    let data: any = null;
    try {
      data = JSON.parse(texto);
    } catch {
      const extracto = sinToken(texto).replace(/\s+/g, ' ').trim().slice(0, 200);
      console.error(`Cédula: el proveedor no devolvió JSON (HTTP ${respuesta.status})`);
      return res.status(502).json({
        error: `El proveedor no devolvió JSON (HTTP ${respuesta.status}): ${extracto || '(respuesta vacía)'}`
      });
    }

    const detalleProveedor = sinToken(String(data?.error || data?.message || '')).trim();

    if (!respuesta.ok) {
      const { estado, mensaje } = traducirEstadoHttp(respuesta.status, detalleProveedor);
      console.error(`Cédula: proveedor respondió HTTP ${respuesta.status}`);
      return res.status(estado).json({ error: mensaje });
    }

    // El proveedor puede responder HTTP 200 con success:false (token inválido,
    // sin saldo...). No se reintenta: fallaría igual y gastaría saldo.
    if (data?.success === false) {
      return res.status(502).json({
        error: `Servicio de cédulas: ${detalleProveedor || 'error no especificado'}`
      });
    }

    // La API Full devuelve la persona anidada; una respuesta plana también es
    // posible. Se soportan ambas sin hacer una segunda consulta.
    const persona: any = data?.persona ?? data ?? {};
    const direccion: any = persona?.direccion ?? {};
    const fechas: any = persona?.fechas ?? {};

    const nombreCompleto = texto_(persona.nombre);
    if (!nombreCompleto) {
      // Solo se registran las CLAVES para poder diagnosticar un cambio de
      // formato. Nunca valores: son datos personales.
      console.error('Cédula: respuesta sin nombre. Claves recibidas:', Object.keys(persona || {}));
      return res.status(404).json({ error: 'No se encontraron datos para esta cédula' });
    }

    // La estructura plana entrega el domicilio como "PROVINCIA/CANTON/PARROQUIA".
    // Solo se usa como respaldo si el objeto `direccion` no vino.
    const partesDomicilio = texto_(persona.lugarDomicilio).split('/').map((s: string) => s.trim());

    // Dirección: se prioriza que la API entregue calle y transversal separadas.
    // Si solo llega un campo con ';' dentro, se parte por ese separador.
    const calleCruda = texto_(direccion.calle) || texto_(persona.calleDomicilio);
    const transversalApi =
      texto_(direccion.transversal) ||
      texto_(direccion.calleSecundaria) ||
      texto_(persona.transversal);
    const dir = transversalApi
      ? { calle: calleCruda, transversal: transversalApi }
      : separarDireccion(calleCruda);

    const resultado = {
      cedula: texto_(persona.cedula) || texto_(data?.cedula) || cedula,
      apellidos: extraerApellidos(persona, nombreCompleto),
      nombres: extraerNombres(persona, nombreCompleto),
      sexo: normalizarSexo(persona.sexo ?? persona.genero),
      fechaNacimiento: formatearFecha(fechas.nacimiento ?? persona.fechaNacimiento),
      pais: 'ECUADOR',
      nacionalidad: texto_(persona.nacionalidad) || 'ECUATORIANA',
      provincia: texto_(direccion.provincia) || partesDomicilio[0] || '',
      canton: texto_(direccion.canton) || partesDomicilio[1] || '',
      parroquia: texto_(direccion.parroquia) || partesDomicilio[2] || '',
      // La API no entrega ciudad ni transversal. Se dejan vacíos a propósito:
      // el cantón NO equivale a la ciudad y asumirlo introduciría datos falsos
      // en un documento oficial.
      ciudad: '',
      calle: dir.calle,
      num: texto_(direccion.numeroCasa) || texto_(persona.numeracionDomicilio),
      transversal: dir.transversal,
      telefono: texto_(persona.celular),
      correo: texto_(persona.email),
      // Texto crudo de la API ("BACHILLER", "SUPERIOR"...). El frontend lo
      // traduce a los valores del desplegable (a1/a2/a4), que son suyos.
      instruccion: texto_(persona.instruccion),
      nombrepapa: texto_(persona.nombrePadre),
      nombremama: texto_(persona.nombreMadre)
    };

    res.json(resultado);
  } catch (error: any) {
    const detalle = sinToken(error?.message || String(error));
    console.error('Error al consultar cédula:', detalle);
    res.status(502).json({ error: `No se pudo consultar la cédula — ${detalle}` });
  }
};

// Traduce el código HTTP del proveedor a un estado y un mensaje entendibles.
// Los errores de configuración/saldo se devuelven como 502 para no confundirlos
// con errores de la petición del usuario.
function traducirEstadoHttp(status: number, detalle: string): { estado: number; mensaje: string } {
  const sufijo = detalle ? ` — ${detalle}` : '';
  switch (status) {
    case 400:
      return { estado: 400, mensaje: `Cédula inválida o petición mal formada${sufijo}` };
    case 401:
      return { estado: 502, mensaje: `Token de la API rechazado (401)${sufijo}` };
    case 402:
      return { estado: 502, mensaje: `Saldo insuficiente en la API de cédulas (402)${sufijo}` };
    case 404:
      return { estado: 404, mensaje: 'No se encontraron datos para esta cédula' };
    case 429:
      return { estado: 429, mensaje: `Demasiadas consultas seguidas. Espere unos segundos${sufijo}` };
    case 500:
      return { estado: 502, mensaje: `Error interno del proveedor (500)${sufijo}` };
    case 503:
      return { estado: 503, mensaje: `Servicio de cédulas no disponible (503)${sufijo}` };
    default:
      return { estado: 502, mensaje: `El proveedor respondió HTTP ${status}${sufijo}` };
  }
}

function texto_(valor: any): string {
  return valor == null ? '' : String(valor).trim();
}

/**
 * Separa una dirección que llega en un solo campo.
 *
 * La API entrega a veces "DIEGO DE RODRIGUEZ ISIDRO BARR; AV DIEGO DE ROBLES",
 * donde el ';' separa la calle principal de la transversal. Sin ';' no hay
 * forma fiable de dividirla: NO se corta por longitud ni por la letra "Y",
 * porque "Y" puede formar parte del nombre real de una calle
 * ("JUAN Y MARIA"). En ese caso todo queda como calle principal.
 */
function separarDireccion(valor: string): { calle: string; transversal: string } {
  const texto = texto_(valor);
  if (!texto) return { calle: '', transversal: '' };

  const partes = texto
    .split(';')
    .map(parte => parte.trim())
    .filter(Boolean);

  if (partes.length <= 1) return { calle: texto, transversal: '' };
  // Con más de un ';', el resto se reagrupa como transversal sin perder nada.
  return { calle: partes[0], transversal: partes.slice(1).join('; ') };
}

// LIMITACIÓN CONOCIDA: si la API entrega apellidos/nombres por separado se usan
// tal cual. Si solo entrega el nombre completo ("APELLIDO1 APELLIDO2 NOMBRE1
// NOMBRE2") no hay forma fiable de separarlo, así que se conserva el método
// histórico: las 2 primeras palabras son apellidos. Falla con apellidos simples
// o compuestos ("DE LA CRUZ") y debe corregirse a mano en el formulario.
function extraerApellidos(persona: any, nombreCompleto: string): string {
  const directo = texto_(persona?.apellidos);
  if (directo) return directo;
  return nombreCompleto.split(/\s+/).slice(0, 2).join(' ');
}

function extraerNombres(persona: any, nombreCompleto: string): string {
  const directo = texto_(persona?.nombres);
  if (directo) return directo;
  return nombreCompleto.split(/\s+/).slice(2).join(' ');
}

function normalizarSexo(valor: any): string {
  const v = texto_(valor).toUpperCase();
  if (v === 'HOMBRE' || v === 'MASCULINO') return 'Masculino';
  if (v === 'MUJER' || v === 'FEMENINO') return 'Femenino';
  return '';
}

// El input type="date" del formulario exige YYYY-MM-DD. La API puede entregar
// ese mismo formato o DD/MM/YYYY según el nivel consultado.
function formatearFecha(fecha: any): string {
  const f = texto_(fecha);
  if (!f) return '';
  const iso = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ddmmyyyy = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  return '';
}
