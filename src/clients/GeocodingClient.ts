import { DEFAULT_TIMEOUT_MS, fetchWithTimeout, type FetchFn } from './fetchWithTimeout';

export const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Cliente HTTP de la Geocoding API de Open-Meteo (solo comunicación de red). */
export class GeocodingClient {
  constructor(
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init),
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  /** URL con `name` URL-encoded y `count=1` (Requisito 2.1). */
  buildUrl(cityName: string): string {
    const params = new URLSearchParams({ name: cityName, count: '1' });
    return `${GEOCODING_BASE_URL}?${params.toString()}`;
  }

  /** Retorna la respuesta cruda o lanza `TimeoutError` / `NetworkError`. */
  search(cityName: string): Promise<Response> {
    return fetchWithTimeout(this.buildUrl(cityName), this.fetchFn, this.timeoutMs);
  }
}
