import { Request, Response } from 'express';
import Groq from 'groq-sdk';
import {
  ErrorExtraccion, ESQUEMA_EXTRACCION, PROMPT_EXTRACCION,
  validarTextoExtraccion, validarDatosExtraidos,
} from '../lib/matricula-extraccion';

export async function generarConGroq(texto: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'REEMPLAZA_ESTE_TEXTO_CON_TU_CLAVE') {
    throw new ErrorExtraccion(503, 'Configura GROQ_API_KEY en el entorno del backend y reinicia el servicio para usar el llenado inteligente.');
  }
  // Se instancia en la petición: dotenv ya se cargó, y la clave nunca viaja al frontend.
  const groq = new Groq({ apiKey, timeout: 30000, maxRetries: 0 });
  const respuesta = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-20b',
    messages: [
      { role: 'system', content: PROMPT_EXTRACCION },
      { role: 'system', content: 'El objeto JSON debe respetar exactamente este esquema: ' + JSON.stringify(ESQUEMA_EXTRACCION) },
      { role: 'user', content: texto },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_completion_tokens: 4096,
  });
  return respuesta.choices[0]?.message.content || '';
}

// Generador inyectable para probar el endpoint sin enviar datos reales al proveedor.
export function crearExtraerDatosMatricula(generar: (texto: string) => Promise<string> = generarConGroq) {
  return async (req: Request, res: Response) => {
    try {
      const texto = validarTextoExtraccion(req.body);
      const respuesta = await generar(texto);
      let datos: unknown;
      try { datos = JSON.parse(respuesta); }
      catch { throw new ErrorExtraccion(502, 'La IA no devolvió un JSON válido. Intenta de nuevo.'); }
      return res.json(validarDatosExtraidos(datos));
    } catch (error: unknown) {
      if (error instanceof ErrorExtraccion) {
        return res.status(error.status).json({ error: error.message });
      }
      const externo = error as { status?: number; name?: string } | null;
      if (externo?.status === 429) return res.status(429).json({ error: 'Se alcanzó la cuota de Groq. Espera un momento o revisa la cuota de tu clave.' });
      if (externo?.status === 503) return res.status(503).json({ error: 'Groq tiene alta demanda en este momento. Espera un momento y vuelve a intentarlo; tu texto se conserva.' });
      if ([400, 401, 403, 404].includes(externo?.status || 0)) {
        return res.status(503).json({ error: 'Groq no está disponible con la clave o el modelo configurado. Revisa GROQ_API_KEY y GROQ_MODEL en el backend.' });
      }
      if (externo?.name === 'AbortError' || externo?.name === 'TimeoutError' || externo?.name === 'APIConnectionTimeoutError' || externo?.status === 408 || externo?.status === 504) {
        return res.status(504).json({ error: 'Groq tardó demasiado. Intenta de nuevo o completa los campos manualmente.' });
      }
      // No registrar dictados, respuestas personales ni errores que puedan incluir claves.
      return res.status(502).json({ error: 'No se pudo extraer la información. Puedes reintentar o llenar el formulario manualmente.' });
    }
  };
}

export const extraerDatosMatricula = crearExtraerDatosMatricula();
