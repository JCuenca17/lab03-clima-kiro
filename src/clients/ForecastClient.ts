import { DEFAULT_TIMEOUT_MS, fetchWithTimeout, type FetchFn } from './fetchWithTimeout';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
export const CURRENT_VARIABLES = 'temperature_2m,relative_humidity_2m,precipitation';

/** Cliente HTTP de la Forecast API de Open-Meteo (solo comunicación de red). */
export class ForecastClient {
  constructor(
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init),
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  /** URL con `latitude`, `longitude` y `current=...` (Requisito 3.1). */
  buildUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: CURRENT_VARIABLES,
    });
    return `${FORECAST_BASE_URL}?${params.toString()}`;
  }

  /** Retorna la respuesta cruda o lanza `TimeoutError` / `NetworkError`. */
  fetchCurrent(lat: number, lon: number): Promise<Response> {
    return fetchWithTimeout(this.buildUrl(lat, lon), this.fetchFn, this.timeoutMs);
  }
}
