import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  ErrorExtraccion, ESQUEMA_EXTRACCION, PROMPT_EXTRACCION,
  validarTextoExtraccion, validarDatosExtraidos,
} from '../lib/matricula-extraccion';

export async function generarConGemini(texto: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'REEMPLAZA_ESTE_TEXTO_CON_TU_CLAVE') {
    throw new ErrorExtraccion(503, 'Configura GEMINI_API_KEY en backend/.env y reinicia el backend para usar el llenado inteligente.');
  }
  // Se instancia en la petición: dotenv ya se cargó, y la clave nunca viaja al frontend.
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 30000 } });
  const respuesta = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
    contents: texto,
    config: {
      systemInstruction: PROMPT_EXTRACCION,
      responseMimeType: 'application/json',
      responseJsonSchema: ESQUEMA_EXTRACCION,
      temperature: 0,
      maxOutputTokens: 4096,
    },
  });
  return respuesta.text || '';
}

// Generador inyectable para probar el endpoint sin enviar datos reales a Google.
export function crearExtraerDatosMatricula(generar: (texto: string) => Promise<string> = generarConGemini) {
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
      const externo = error as { status?: number; name?: string };
      if (externo?.status === 429) return res.status(429).json({ error: 'Se alcanzó la cuota de Gemini. Espera un momento o revisa la cuota de tu clave.' });
      if (externo?.status === 503) return res.status(503).json({ error: 'Gemini tiene alta demanda en este momento. Espera un momento y vuelve a intentarlo; tu texto se conserva.' });
      if ([400, 401, 403, 404].includes(externo?.status || 0)) {
        return res.status(503).json({ error: 'Gemini no está disponible con la clave o el modelo configurado. Revisa GEMINI_API_KEY y GEMINI_MODEL en el backend.' });
      }
      if (externo?.name === 'AbortError' || externo?.name === 'TimeoutError' || externo?.status === 504) {
        return res.status(504).json({ error: 'Gemini tardó demasiado. Intenta de nuevo o completa los campos manualmente.' });
      }
      // No registrar dictados, respuestas personales ni errores que puedan incluir claves.
      return res.status(502).json({ error: 'No se pudo extraer la información. Puedes reintentar o llenar el formulario manualmente.' });
    }
  };
}

export const extraerDatosMatricula = crearExtraerDatosMatricula();
