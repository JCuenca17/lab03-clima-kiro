import type {
  AppState,
  ForecastServiceContract,
  GeocodingServiceContract,
} from './types';
import type { WeatherDisplay } from './components/WeatherDisplay';
import type { LoadingIndicator } from './components/LoadingIndicator';
import type { ErrorMessage } from './components/ErrorMessage';
import { forecastErrorMessage, geocodingErrorMessage, MESSAGES } from './utils/errorMessages';

export interface WeatherControllerDeps {
  geocodingService: GeocodingServiceContract;
  forecastService: ForecastServiceContract;
  display: Pick<WeatherDisplay, 'render' | 'clear'>;
  loading: Pick<LoadingIndicator, 'show' | 'hide'>;
  errorMessage: Pick<ErrorMessage, 'show' | 'clear'>;
  /** Para devolver el foco a City_Input tras un error (Requisito 1.6). */
  searchForm?: { focus(): void };
}

/** Orquesta Geocoding → Forecast y actualiza la UI según el resultado. */
export class WeatherController {
  private state: AppState = { status: 'idle' };

  constructor(private readonly deps: WeatherControllerDeps) {}

  getState(): AppState {
    return this.state;
  }

  async search(rawCityName: string): Promise<void> {
    const { geocodingService, forecastService, display, loading, errorMessage } = this.deps;
    const cityName = rawCityName.trim();

    // Validación antes de cualquier llamada de red
    if (cityName.length === 0) {
      this.fail(MESSAGES.VALIDATION_EMPTY);
      return;
    }

    // Limpiar estado previo y mostrar el indicador de carga (Requisito 4.6)
    display.clear();
    errorMessage.clear();
    loading.show();
    this.state = { status: 'loading' };

    try {
      const geo = await geocodingService.geocode(cityName);
      if (!geo.success) {
        this.fail(geocodingErrorMessage(geo.error));
        return;
      }

      const forecast = await forecastService.getForecast(geo.data.latitude, geo.data.longitude);
      if (!forecast.success) {
        this.fail(forecastErrorMessage(forecast.error));
        return;
      }

      const shownName = geo.data.cityName.trim().length > 0 ? geo.data.cityName : cityName;
      display.render(geo.data.cityName, forecast.data, cityName);
      this.state = { status: 'success', cityName: shownName, weather: forecast.data };
    } finally {
      loading.hide();
    }
  }

  private fail(message: string): void {
    this.deps.loading.hide();
    this.deps.display.clear();
    this.deps.errorMessage.show(message);
    this.deps.searchForm?.focus();
    this.state = { status: 'error', message };
  }
}
