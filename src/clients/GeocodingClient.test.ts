import { afterEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { GeocodingClient, GEOCODING_BASE_URL } from './GeocodingClient';
import { NetworkError, TimeoutError } from './errors';
import { fakeResponse, hangingFetch } from '../test/helpers';

describe('GeocodingClient', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Feature: weather-forecast-app, Propiedad 3: Construcción correcta de la URL de Geocodificación
  it('Propiedad 3: la URL contiene el nombre URL-encoded como `name` y `count=1`', () => {
    const client = new GeocodingClient();
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (cityName) => {
        const url = new URL(client.buildUrl(cityName));
        expect(`${url.origin}${url.pathname}`).toBe(GEOCODING_BASE_URL);
        expect(url.searchParams.get('name')).toBe(cityName);
        expect(url.searchParams.get('count')).toBe('1');
        // El nombre viaja codificado: la URL cruda nunca contiene espacios ni "&" sueltos del nombre
        expect(url.href).not.toContain(' ');
      }),
      { numRuns: 100 },
    );
  });

  it('codifica nombres con espacios, tildes y "&"', () => {
    const url = new GeocodingClient().buildUrl('São Paulo & Río');
    expect(url).toBe(`${GEOCODING_BASE_URL}?name=S%C3%A3o+Paulo+%26+R%C3%ADo&count=1`);
  });

  it('retorna la Response cruda de fetch', async () => {
    const response = fakeResponse({ results: [] });
    const fetchFn = vi.fn(async () => response);
    const client = new GeocodingClient(fetchFn);

    await expect(client.search('Lima')).resolves.toBe(response);
    expect(fetchFn).toHaveBeenCalledWith(client.buildUrl('Lima'), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('lanza TimeoutError si la API no responde en 10 segundos', async () => {
    vi.useFakeTimers();
    const client = new GeocodingClient(hangingFetch());
    const pending = client.search('Lima');
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('no lanza timeout antes de los 10 segundos', async () => {
    vi.useFakeTimers();
    const fetchFn = hangingFetch();
    const client = new GeocodingClient(fetchFn);
    let settled = false;
    client.search('Lima').catch(() => (settled = true));
    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });

  it('lanza NetworkError si fetch falla por la red', async () => {
    const client = new GeocodingClient(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(client.search('Lima')).rejects.toBeInstanceOf(NetworkError);
  });
});
