/** La solicitud superó el tiempo máximo de espera (10 s). */
export class TimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`La solicitud a ${url} superó ${timeoutMs} ms.`);
    this.name = 'TimeoutError';
  }
}

/** Fallo de red: sin conexión, DNS, CORS, etc. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : 'Error de red.');
    this.name = 'NetworkError';
  }
}
