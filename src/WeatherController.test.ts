import { describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { WeatherController } from './WeatherController';
import { WeatherDisplay } from './components/WeatherDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ErrorMessage } from './components/ErrorMessage';
import type { ForecastResult, GeocodingResult, WeatherData } from './types';

const AREQUIPA: GeocodingResult = {
  success: true,
  data: { latitude: -16.39889, longitude: -71.535, cityName: 'Arequipa' },
};
const WEATHER: WeatherData = { temperature: 19.3, humidity: 27, precipitation: 0 };

function setup(geo: GeocodingResult = AREQUIPA, forecast: ForecastResult = { success: true, data: WEATHER }) {
  document.body.innerHTML = `
    <div id="loading-indicator" hidden></div>
    <p id="error-message" hidden></p>
    <section id="weather-display"></section>`;
  const displayEl = document.getElementById('weather-display')!;
  const loadingEl = document.getElementById('loading-indicator')!;
  const errorEl = document.getElementById('error-message')!;
  const display = new WeatherDisplay(displayEl);
  const loading = new LoadingIndicator(loadingEl);
  const errorMessage = new ErrorMessage(errorEl);
  const geocodingService = { geocode: vi.fn(async (_name: string) => geo) };
  const forecastService = { getForecast: vi.fn(async (_lat: number, _lon: number) => forecast) };
  const searchForm = { focus: vi.fn() };
  const controller = new WeatherController({
    geocodingService,
    forecastService,
    display,
    loading,
    errorMessage,
    searchForm,
  });
  return { controller, display, displayEl, loading, loadingEl, errorMessage, errorEl, geocodingService, forecastService, searchForm };
}

describe('WeatherController — propiedades', () => {
  // Feature: weather-forecast-app, Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda
  it('Propiedad 13: el display queda limpio antes de que llegue la respuesta de la Forecast API', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(
          fc.record({
            city: fc.string({ minLength: 1 }),
            weather: fc.record({ temperature: fc.float(), humidity: fc.float(), precipitation: fc.float() }),
          }),
          { nil: null },
        ),
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        async (previous, newCity) => {
          const ui = setup();
          if (previous) ui.display.render(previous.city, previous.weather);

          let displayWhenForecastRequested: string | null = null;
          ui.forecastService.getForecast.mockImplementation(async () => {
            displayWhenForecastRequested = ui.displayEl.innerHTML;
            return { success: true, data: WEATHER };
          });

          await ui.controller.search(newCity);

          expect(displayWhenForecastRequested).toBe('');
          expect(ui.displayEl.textContent).toContain('Arequipa');
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('WeatherController — pruebas unitarias', () => {
  it('flujo exitoso completo: geocoding → forecast → display renderizado', async () => {
    const ui = setup();
    await ui.controller.search('  Arequipa ');
    expect(ui.geocodingService.geocode).toHaveBeenCalledWith('Arequipa');
    expect(ui.forecastService.getForecast).toHaveBeenCalledWith(-16.39889, -71.535);
    expect(ui.displayEl.textContent).toContain('Arequipa');
    expect(ui.displayEl.textContent).toContain('19.3 °C');
    expect(ui.displayEl.textContent).toContain('27 %');
    expect(ui.displayEl.textContent).toContain('0.0 mm');
    expect(ui.errorEl.hidden).toBe(true);
    expect(ui.controller.getState()).toEqual({ status: 'success', cityName: 'Arequipa', weather: WEATHER });
  });

  it('GeocodingService retorna CITY_NOT_FOUND → mensaje correcto y no consulta el pronóstico', async () => {
    const ui = setup({ success: false, error: { type: 'CITY_NOT_FOUND' } });
    await ui.controller.search('asdfghjk');
    expect(ui.errorMessage.text).toBe('No se encontró la ciudad ingresada. Verifica el nombre e intenta de nuevo.');
    expect(ui.forecastService.getForecast).not.toHaveBeenCalled();
    expect(ui.searchForm.focus).toHaveBeenCalled();
  });

  it('ForecastService retorna INCOMPLETE_DATA → mensaje correcto', async () => {
    const ui = setup(AREQUIPA, { success: false, error: { type: 'INCOMPLETE_DATA' } });
    await ui.controller.search('Arequipa');
    expect(ui.errorMessage.text).toBe('Los datos meteorológicos recibidos están incompletos.');
    expect(ui.displayEl.textContent).toBe('');
  });

  it.each([
    [{ type: 'NETWORK_ERROR' }, 'El servicio de geocodificación no está disponible. Verifica tu conexión.'],
    [{ type: 'TIMEOUT' }, 'El servicio de geocodificación no respondió a tiempo.'],
    [{ type: 'SERVICE_ERROR', statusCode: 503 }, 'El servicio de geocodificación retornó un error.'],
    [{ type: 'INVALID_RESPONSE' }, 'Los datos recibidos del servicio de geocodificación no son válidos.'],
  ] as const)('error de geocodificación %o → "%s"', async (error, message) => {
    const ui = setup({ success: false, error });
    await ui.controller.search('Lima');
    expect(ui.errorMessage.text).toBe(message);
  });

  it.each([
    [{ type: 'NETWORK_ERROR' }, 'El servicio de pronóstico no está disponible. Verifica tu conexión.'],
    [{ type: 'TIMEOUT' }, 'El servicio de pronóstico no respondió a tiempo.'],
    [{ type: 'SERVICE_ERROR', statusCode: 500 }, 'El servicio de pronóstico retornó un error.'],
    [{ type: 'INVALID_RESPONSE' }, 'Los datos recibidos del servicio de pronóstico no son válidos.'],
  ] as const)('error de pronóstico %o → "%s"', async (error, message) => {
    const ui = setup(AREQUIPA, { success: false, error });
    await ui.controller.search('Lima');
    expect(ui.errorMessage.text).toBe(message);
  });

  it('el indicador de carga aparece al iniciar y desaparece al completar (éxito)', async () => {
    const ui = setup();
    let visibleDuringRequest = false;
    ui.geocodingService.geocode.mockImplementation(async () => {
      visibleDuringRequest = ui.loading.isVisible();
      return AREQUIPA;
    });
    await ui.controller.search('Arequipa');
    expect(visibleDuringRequest).toBe(true);
    expect(ui.loading.isVisible()).toBe(false);
  });

  it('el indicador de carga desaparece también ante un error', async () => {
    const ui = setup(AREQUIPA, { success: false, error: { type: 'TIMEOUT' } });
    let visibleDuringRequest = false;
    ui.forecastService.getForecast.mockImplementation(async () => {
      visibleDuringRequest = ui.loading.isVisible();
      return { success: false, error: { type: 'TIMEOUT' } };
    });
    await ui.controller.search('Arequipa');
    expect(visibleDuringRequest).toBe(true);
    expect(ui.loading.isVisible()).toBe(false);
  });

  it('nombre vacío en la respuesta → se muestra el nombre ingresado por el usuario', async () => {
    const ui = setup({ success: true, data: { latitude: 1, longitude: 2, cityName: '' } });
    await ui.controller.search('mi pueblo');
    expect(ui.displayEl.querySelector('.city-name')?.textContent).toBe('mi pueblo');
  });

  it('entrada vacía → VALIDATION_EMPTY sin llamadas de red', async () => {
    const ui = setup();
    await ui.controller.search('   ');
    expect(ui.errorMessage.text).toBe('El nombre de la ciudad es obligatorio.');
    expect(ui.geocodingService.geocode).not.toHaveBeenCalled();
  });

  it('una búsqueda nueva limpia el error anterior', async () => {
    const ui = setup({ success: false, error: { type: 'CITY_NOT_FOUND' } });
    await ui.controller.search('xx');
    ui.geocodingService.geocode.mockResolvedValue(AREQUIPA);
    await ui.controller.search('Arequipa');
    expect(ui.errorEl.hidden).toBe(true);
    expect(ui.displayEl.textContent).toContain('Arequipa');
  });
});
