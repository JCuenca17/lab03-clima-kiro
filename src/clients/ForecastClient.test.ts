import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { ForecastClient, FORECAST_BASE_URL } from './ForecastClient';
import { NetworkError, TimeoutError } from './errors';
import { hangingFetch } from '../test/helpers';

describe('ForecastClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Feature: weather-forecast-app, Propiedad 6: Construcción correcta de la URL de Pronóstico
  it('Propiedad 6: la URL contiene latitude, longitude y current con las tres variables', () => {
    const client = new ForecastClient();
    fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
        ),
        ([lat, lon]) => {
          const url = new URL(client.buildUrl(lat, lon));
          expect(`${url.origin}${url.pathname}`).toBe(FORECAST_BASE_URL);
          expect(Number(url.searchParams.get('latitude'))).toBe(lat === 0 ? 0 : lat);
          expect(Number(url.searchParams.get('longitude'))).toBe(lon === 0 ? 0 : lon);
          expect(url.searchParams.get('current')?.split(',')).toEqual([
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation',
          ]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('lanza TimeoutError si la API no responde en 10 segundos', async () => {
    vi.useFakeTimers();
    const client = new ForecastClient(hangingFetch());
    const pending = client.fetchCurrent(-16.4, -71.5);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('lanza NetworkError si fetch falla por la red', async () => {
    const client = new ForecastClient(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(client.fetchCurrent(0, 0)).rejects.toBeInstanceOf(NetworkError);
  });
});
