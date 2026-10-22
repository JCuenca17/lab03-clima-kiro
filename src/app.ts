import { GeocodingClient } from './clients/GeocodingClient';
import { ForecastClient } from './clients/ForecastClient';
import { GeocodingService } from './services/GeocodingService';
import { ForecastService } from './services/ForecastService';
import { CitySearchForm } from './components/CitySearchForm';
import { WeatherDisplay } from './components/WeatherDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ErrorMessage } from './components/ErrorMessage';
import { WeatherController } from './WeatherController';

export interface AppClients {
  geocodingClient: Pick<GeocodingClient, 'search'>;
  forecastClient: Pick<ForecastClient, 'fetchCurrent'>;
}

/**
 * Ensambla las capas: Presentación → WeatherController → Servicios → Clientes HTTP,
 * y monta los componentes en el DOM de index.html.
 */
export function createApp(
  root: Document = document,
  clients: AppClients = { geocodingClient: new GeocodingClient(), forecastClient: new ForecastClient() },
) {
  const byId = (id: string): HTMLElement => {
    const element = root.getElementById(id);
    if (!element) throw new Error(`No se encontró #${id} en index.html`);
    return element;
  };

  const display = new WeatherDisplay(byId('weather-display'));
  const loading = new LoadingIndicator(byId('loading-indicator'));
  const errorMessage = new ErrorMessage(byId('error-message'));

  let controller: WeatherController;
  const searchForm = new CitySearchForm(byId('search'), (cityName) => {
    void controller.search(cityName);
  });

  controller = new WeatherController({
    geocodingService: new GeocodingService(clients.geocodingClient),
    forecastService: new ForecastService(clients.forecastClient),
    display,
    loading,
    errorMessage,
    searchForm,
  });

  return { controller, searchForm, display, loading, errorMessage };
}
