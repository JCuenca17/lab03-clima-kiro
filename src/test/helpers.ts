import { vi } from 'vitest';

/**
 * Respuesta HTTP falsa. `json()` devuelve el objeto tal cual (sin pasar por
 * JSON.stringify), así se conservan valores como NaN, Infinity o -0 que
 * generan las pruebas de propiedades.
 */
export function fakeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** Respuesta 2xx cuyo cuerpo no es JSON válido. */
export function unparseableResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  } as unknown as Response;
}

/** fetch que nunca responde, pero que se rechaza al abortar la señal. */
export function hangingFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      }),
  );
}
