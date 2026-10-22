// Tipos del dominio (design.md → Components and Interfaces / Data Models)

/** Coordenadas extraídas del primer resultado de la Geocoding API. */
export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Nombre retornado por la Geocoding API (`results[0].name`). */
  cityName: string;
}

export type GeocodingError =
  | { type: 'CITY_NOT_FOUND' }
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INVALID_RESPONSE' };

export type GeocodingResult =
  | { success: true; data: Coordinates }
  | { success: false; error: GeocodingError };

/** Valores crudos del clima actual (sin formatear). */
export interface WeatherData {
  temperature: number; // current.temperature_2m (°C)
  humidity: number; // current.relative_humidity_2m (%)
  precipitation: number; // current.precipitation (mm)
}

export type ForecastError =
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INCOMPLETE_DATA' }
  | { type: 'INVALID_RESPONSE' };

export type ForecastResult =
  | { success: true; data: WeatherData }
  | { success: false; error: ForecastError };

export interface GeocodingServiceContract {
  geocode(cityName: string): Promise<GeocodingResult>;
}

export interface ForecastServiceContract {
  getForecast(lat: number, lon: number): Promise<ForecastResult>;
}

/** Estados de la aplicación (design.md → Estados de la Aplicación). */
export type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; cityName: string; weather: WeatherData }
  | { status: 'error'; message: string };
