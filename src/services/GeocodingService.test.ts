import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { GeocodingService } from './GeocodingService';
import { NetworkError, TimeoutError } from '../clients/errors';
import { geocodingErrorMessage } from '../utils/errorMessages';
import { fakeResponse, unparseableResponse } from '../test/helpers';

function serviceReturning(response: Response | Error) {
  const search = vi.fn(async (_name: string) => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { service: new GeocodingService({ search }), search };
}

describe('GeocodingService — propiedades', () => {
  // Feature: weather-forecast-app, Propiedad 4: Extracción de coordenadas del primer resultado
  it('Propiedad 4: las coordenadas extraídas son idénticas a las del primer resultado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ latitude: fc.float(), longitude: fc.float(), name: fc.string() }),
        fc.array(fc.record({ latitude: fc.float(), longitude: fc.float(), name: fc.string() }), {
          maxLength: 3,
        }),
        async (first, others) => {
          const { service } = serviceReturning(fakeResponse({ results: [first, ...others] }));
          const result = await service.geocode('ciudad');
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.latitude).toBe(first.latitude);
            expect(result.data.longitude).toBe(first.longitude);
            expect(result.data.cityName).toBe(first.name);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 5: Validación de campos de coordenadas faltantes
  it('Propiedad 5: latitude o longitude nulos/ausentes → CITY_NOT_FOUND', async () => {
    const missing = fc.constantFrom(null, undefined, 'absent' as const);
    const present = fc.float({ noNaN: true });
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.tuple(missing, missing),
          fc.tuple(missing, present),
          fc.tuple(present, missing),
        ),
        fc.string(),
        async ([lat, lon], name) => {
          const result: Record<string, unknown> = { name };
          if (lat !== 'absent') result.latitude = lat;
          if (lon !== 'absent') result.longitude = lon;
          const { service } = serviceReturning(fakeResponse({ results: [result] }));
          expect(await service.geocode('ciudad')).toEqual({
            success: false,
            error: { type: 'CITY_NOT_FOUND' },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 8: Respuestas HTTP no-2xx siempre generan error (Geocoding)
  it('Propiedad 8 (Geocoding): cualquier estado 300–599 → SERVICE_ERROR que identifica a geocodificación', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 300, max: 599 }), async (status) => {
        const { service } = serviceReturning(fakeResponse(null, status));
        const result = await service.geocode('Lima');
        expect(result).toEqual({ success: false, error: { type: 'SERVICE_ERROR', statusCode: status } });
        if (!result.success) {
          expect(geocodingErrorMessage(result.error)).toContain('geocodificación');
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 9: Respuestas 2xx con cuerpo inválido generan error (Geocoding)
  it('Propiedad 9 (Geocoding): cuerpo 2xx que no corresponde al modelo → INVALID_RESPONSE', async () => {
    const malformed = fc.oneof(
      fc.constant(null),
      fc.string(),
      fc.integer(),
      fc.array(fc.anything()),
      fc.record({ results: fc.oneof(fc.string(), fc.integer(), fc.dictionary(fc.string(), fc.string())) }),
      fc.record({
        results: fc.tuple(
          fc.record({ latitude: fc.string(), longitude: fc.float({ noNaN: true }), name: fc.string() }),
        ),
      }),
    );
    await fc.assert(
      fc.asyncProperty(malformed, async (body) => {
        const { service } = serviceReturning(fakeResponse(body));
        const result = await service.geocode('Lima');
        expect(result).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
        if (!result.success) {
          expect(geocodingErrorMessage(result.error)).toMatch(/no son válidos/);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('GeocodingService — pruebas unitarias', () => {
  it('0 resultados → CITY_NOT_FOUND', async () => {
    const { service } = serviceReturning(fakeResponse({ results: [] }));
    expect(await service.geocode('asdfghjk')).toEqual({ success: false, error: { type: 'CITY_NOT_FOUND' } });
  });

  it('sin la clave `results` (así responde Open-Meteo si no encuentra nada) → CITY_NOT_FOUND', async () => {
    const { service } = serviceReturning(fakeResponse({ generationtime_ms: 0.07 }));
    expect(await service.geocode('asdfghjk')).toEqual({ success: false, error: { type: 'CITY_NOT_FOUND' } });
  });

  it('error de red → NETWORK_ERROR', async () => {
    const { service } = serviceReturning(new NetworkError(new TypeError('Failed to fetch')));
    expect(await service.geocode('Lima')).toEqual({ success: false, error: { type: 'NETWORK_ERROR' } });
  });

  it('timeout simulado → TIMEOUT', async () => {
    const { service } = serviceReturning(new TimeoutError('url', 10_000));
    expect(await service.geocode('Lima')).toEqual({ success: false, error: { type: 'TIMEOUT' } });
  });

  it('JSON no parseable → INVALID_RESPONSE', async () => {
    const { service } = serviceReturning(unparseableResponse());
    expect(await service.geocode('Lima')).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
  });

  it('respuesta exitosa con un resultado válido → { success: true, data: Coordinates }', async () => {
    const { service, search } = serviceReturning(
      fakeResponse({
        results: [{ id: 3947322, name: 'Arequipa', latitude: -16.39889, longitude: -71.535, country: 'Peru' }],
      }),
    );
    expect(await service.geocode('Arequipa')).toEqual({
      success: true,
      data: { latitude: -16.39889, longitude: -71.535, cityName: 'Arequipa' },
    });
    expect(search).toHaveBeenCalledWith('Arequipa');
  });
});
