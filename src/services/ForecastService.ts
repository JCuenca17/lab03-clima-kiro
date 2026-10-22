import type { ForecastClient } from '../clients/ForecastClient';
import type { ForecastResult, ForecastServiceContract } from '../types';
import { isMissing, isPlainObject, requestJson } from './responseErrors';

const INVALID_RESPONSE: ForecastResult = { success: false, error: { type: 'INVALID_RESPONSE' } };

/** Lógica de negocio del pronóstico: validación, parseo y manejo de errores. */
export class ForecastService implements ForecastServiceContract {
  constructor(private readonly client: Pick<ForecastClient, 'fetchCurrent'>) {}

  async getForecast(lat: number, lon: number): Promise<ForecastResult> {
    const outcome = await requestJson(() => this.client.fetchCurrent(lat, lon));
    if (!outcome.ok) return { success: false, error: outcome.error };

    const body = outcome.body;
    // Sin objeto `current` → el cuerpo no corresponde al modelo esperado (Requisito 5.5)
    if (!isPlainObject(body) || !isPlainObject(body.current)) return INVALID_RESPONSE;

    const { temperature_2m, relative_humidity_2m, precipitation } = body.current;

    // Algún campo nulo o ausente → datos incompletos (Requisito 3.5)
    if ([temperature_2m, relative_humidity_2m, precipitation].some(isMissing)) {
      return { success: false, error: { type: 'INCOMPLETE_DATA' } };
    }
    if (
      typeof temperature_2m !== 'number' ||
      typeof relative_humidity_2m !== 'number' ||
      typeof precipitation !== 'number'
    ) {
      return INVALID_RESPONSE;
    }

    // Valores crudos sin transformación (Requisito 5.2)
    return {
      success: true,
      data: { temperature: temperature_2m, humidity: relative_humidity_2m, precipitation },
    };
  }
}
