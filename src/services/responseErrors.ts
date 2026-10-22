import { TimeoutError } from '../clients/errors';

/** Errores comunes a ambos servicios al comunicarse con un cliente HTTP. */
export type TransportError =
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INVALID_RESPONSE' };

type Outcome = { ok: true; body: unknown } | { ok: false; error: TransportError };

/**
 * Ejecuta la solicitud y clasifica el resultado:
 * timeout → TIMEOUT, fallo de red → NETWORK_ERROR, HTTP no-2xx → SERVICE_ERROR,
 * JSON no parseable → INVALID_RESPONSE.
 */
export async function requestJson(request: () => Promise<Response>): Promise<Outcome> {
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof TimeoutError ? { type: 'TIMEOUT' } : { type: 'NETWORK_ERROR' },
    };
  }

  if (!response.ok) {
    return { ok: false, error: { type: 'SERVICE_ERROR', statusCode: response.status } };
  }

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, error: { type: 'INVALID_RESPONSE' } };
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMissing(value: unknown): boolean {
  return value === null || value === undefined;
}
