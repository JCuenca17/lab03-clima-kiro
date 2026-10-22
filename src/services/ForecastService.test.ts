import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { ForecastService } from './ForecastService';
import { NetworkError, TimeoutError } from '../clients/errors';
import { forecastErrorMessage } from '../utils/errorMessages';
import { fakeResponse, unparseableResponse } from '../test/helpers';

function serviceReturning(response: Response | Error) {
  const fetchCurrent = vi.fn(async (_lat: number, _lon: number) => {
    if (response instanceof Error) throw response;
    return response;
  });
  return { service: new ForecastService({ fetchCurrent }), fetchCurrent };
}

const FIELDS = ['temperature_2m', 'relative_humidity_2m', 'precipitation'] as const;

describe('ForecastService — propiedades', () => {
  // Feature: weather-forecast-app, Propiedad 7: Round-trip de parseo de la respuesta Forecast → WeatherData
  it('Propiedad 7: WeatherData conserva exactamente los valores crudos del JSON', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ temperature_2m: fc.float(), relative_humidity_2m: fc.float(), precipitation: fc.float() }),
        async (current) => {
          const { service } = serviceReturning(fakeResponse({ current: { time: '2026-10-22T12:00', ...current } }));
          const result = await service.getForecast(-16.4, -71.5);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.temperature).toBe(current.temperature_2m);
            expect(result.data.humidity).toBe(current.relative_humidity_2m);
            expect(result.data.precipitation).toBe(current.precipitation);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 10: Campos meteorológicos faltantes generan error de datos incompletos
  it('Propiedad 10: al menos un campo null/undefined/ausente → INCOMPLETE_DATA', async () => {
    const fieldState = fc.constantFrom('ok', 'null', 'undefined', 'absent');
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fieldState, fieldState, fieldState).filter((states) => states.some((s) => s !== 'ok')),
        fc.float({ noNaN: true }),
        async (states, value) => {
          const current: Record<string, unknown> = {};
          states.forEach((state, i) => {
            if (state === 'ok') current[FIELDS[i]] = value;
            if (state === 'null') current[FIELDS[i]] = null;
            if (state === 'undefined') current[FIELDS[i]] = undefined;
          });
          const { service } = serviceReturning(fakeResponse({ current }));
          const result = await service.getForecast(0, 0);
          expect(result).toEqual({ success: false, error: { type: 'INCOMPLETE_DATA' } });
          if (!result.success) {
            expect(forecastErrorMessage(result.error)).toBe('Los datos meteorológicos recibidos están incompletos.');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 8: Respuestas HTTP no-2xx siempre generan error (Forecast)
  it('Propiedad 8 (Forecast): cualquier estado 300–599 → SERVICE_ERROR que identifica al pronóstico', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 300, max: 599 }), async (status) => {
        const { service } = serviceReturning(fakeResponse(null, status));
        const result = await service.getForecast(0, 0);
        expect(result).toEqual({ success: false, error: { type: 'SERVICE_ERROR', statusCode: status } });
        if (!result.success) {
          expect(forecastErrorMessage(result.error)).toContain('pronóstico');
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 9: Respuestas 2xx con cuerpo inválido generan error (Forecast)
  it('Propiedad 9 (Forecast): cuerpo 2xx malformado o sin `current` → INVALID_RESPONSE', async () => {
    const malformed = fc.oneof(
      fc.constant(null),
      fc.string(),
      fc.integer(),
      fc.array(fc.anything()),
      fc.dictionary(fc.string().filter((k) => k !== 'current'), fc.anything()),
      fc.record({ current: fc.oneof(fc.string(), fc.integer(), fc.constant(null)) }),
      fc.record({
        current: fc.record({
          temperature_2m: fc.string(),
          relative_humidity_2m: fc.float({ noNaN: true }),
          precipitation: fc.float({ noNaN: true }),
        }),
      }),
    );
    await fc.assert(
      fc.asyncProperty(malformed, async (body) => {
        const { service } = serviceReturning(fakeResponse(body));
        const result = await service.getForecast(0, 0);
        expect(result).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
        if (!result.success) {
          expect(forecastErrorMessage(result.error)).toMatch(/no son válidos/);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('ForecastService — pruebas unitarias', () => {
  it('error de red → NETWORK_ERROR', async () => {
    const { service } = serviceReturning(new NetworkError(new TypeError('Failed to fetch')));
    expect(await service.getForecast(0, 0)).toEqual({ success: false, error: { type: 'NETWORK_ERROR' } });
  });

  it('timeout simulado → TIMEOUT', async () => {
    const { service } = serviceReturning(new TimeoutError('url', 10_000));
    expect(await service.getForecast(0, 0)).toEqual({ success: false, error: { type: 'TIMEOUT' } });
  });

  it('JSON no parseable → INVALID_RESPONSE', async () => {
    const { service } = serviceReturning(unparseableResponse());
    expect(await service.getForecast(0, 0)).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
  });

  it('respuesta exitosa con todos los campos → { success: true, data: WeatherData }', async () => {
    const { service, fetchCurrent } = serviceReturning(
      fakeResponse({
        latitude: -16.4,
        longitude: -71.5,
        current_units: { temperature_2m: '°C', relative_humidity_2m: '%', precipitation: 'mm' },
        current: { time: '2026-10-22T12:00', temperature_2m: 19.3, relative_humidity_2m: 27, precipitation: 0 },
      }),
    );
    expect(await service.getForecast(-16.39889, -71.535)).toEqual({
      success: true,
      data: { temperature: 19.3, humidity: 27, precipitation: 0 },
    });
    expect(fetchCurrent).toHaveBeenCalledWith(-16.39889, -71.535);
  });
});
