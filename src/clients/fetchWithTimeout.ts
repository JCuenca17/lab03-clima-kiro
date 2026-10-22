import { NetworkError, TimeoutError } from './errors';

export const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * GET con timeout usando AbortController + setTimeout.
 * Retorna la `Response` cruda o lanza `TimeoutError` / `NetworkError`.
 */
export async function fetchWithTimeout(
  url: string,
  fetchFn: FetchFn,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new TimeoutError(url, timeoutMs);
    throw new NetworkError(error);
  } finally {
    clearTimeout(timer);
  }
}
