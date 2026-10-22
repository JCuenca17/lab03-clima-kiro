import type { GeocodingClient } from '../clients/GeocodingClient';
import type { GeocodingResult, GeocodingServiceContract } from '../types';
import { isMissing, isPlainObject, requestJson } from './responseErrors';

const CITY_NOT_FOUND: GeocodingResult = { success: false, error: { type: 'CITY_NOT_FOUND' } };
const INVALID_RESPONSE: GeocodingResult = { success: false, error: { type: 'INVALID_RESPONSE' } };

/** Lógica de negocio de geocodificación: validación, parseo y manejo de errores. */
export class GeocodingService implements GeocodingServiceContract {
  constructor(private readonly client: Pick<GeocodingClient, 'search'>) {}

  async geocode(cityName: string): Promise<GeocodingResult> {
    const outcome = await requestJson(() => this.client.search(cityName));
    if (!outcome.ok) return { success: false, error: outcome.error };

    const body = outcome.body;
    if (!isPlainObject(body)) return INVALID_RESPONSE;

    // `results` ausente o vacío → ciudad no encontrada (Requisito 2.3)
    const { results } = body;
    if (results === undefined) return CITY_NOT_FOUND;
    if (!Array.isArray(results)) return INVALID_RESPONSE;
    if (results.length === 0) return CITY_NOT_FOUND;

    const first: unknown = results[0];
    if (!isPlainObject(first)) return INVALID_RESPONSE;

    // latitude/longitude nulos o ausentes → ciudad no encontrada (Requisito 2.6)
    const { latitude, longitude, name } = first;
    if (isMissing(latitude) || isMissing(longitude)) return CITY_NOT_FOUND;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return INVALID_RESPONSE;

    // Mapeo sin transformación (Requisito 5.1)
    return {
      success: true,
      data: { latitude, longitude, cityName: typeof name === 'string' ? name : '' },
    };
  }
}
