import { beforeEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { WeatherDisplay } from './WeatherDisplay';
import { formatHumidity, formatPrecipitation, formatTemperature } from '../utils/formatters';

function mount() {
  document.body.innerHTML = '<section id="weather-display"></section>';
  const container = document.getElementById('weather-display')!;
  return { container, display: new WeatherDisplay(container) };
}

describe('WeatherDisplay — propiedades', () => {
  // Feature: weather-forecast-app, Propiedad 12: Weather_Display contiene todos los campos con sus unidades
  it('Propiedad 12: muestra la ciudad y los tres valores seguidos de °C, % y mm', () => {
    const { container, display } = mount();
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.record({ temperature: fc.float(), humidity: fc.float(), precipitation: fc.float() }),
        (cityName, weather) => {
          display.render(cityName, weather);
          expect(container.querySelector('.city-name')?.textContent).toBe(cityName);
          const text = container.textContent ?? '';
          expect(text).toContain(formatTemperature(weather.temperature));
          expect(text).toContain(formatHumidity(weather.humidity));
          expect(text).toContain(formatPrecipitation(weather.precipitation));
          expect(formatTemperature(weather.temperature).endsWith('°C')).toBe(true);
          expect(formatHumidity(weather.humidity).endsWith('%')).toBe(true);
          expect(formatPrecipitation(weather.precipitation).endsWith('mm')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('WeatherDisplay — pruebas unitarias', () => {
  let ui: ReturnType<typeof mount>;
  beforeEach(() => {
    ui = mount();
  });

  it('renderiza un ejemplo concreto', () => {
    ui.display.render('Arequipa', { temperature: 19.34, humidity: 27.4, precipitation: 0 });
    expect(ui.container.querySelector('.city-name')?.textContent).toBe('Arequipa');
    expect(ui.container.querySelector('[data-testid="temperature"]')?.textContent).toBe('19.3 °C');
    expect(ui.container.querySelector('[data-testid="humidity"]')?.textContent).toBe('27 %');
    expect(ui.container.querySelector('[data-testid="precipitation"]')?.textContent).toBe('0.0 mm');
  });

  it('usa el nombre ingresado por el usuario si la API no retorna nombre (Requisito 4.7)', () => {
    ui.display.render('', { temperature: 10, humidity: 50, precipitation: 0 }, 'lima');
    expect(ui.container.querySelector('.city-name')?.textContent).toBe('lima');
  });

  it('clear() deja el display vacío', () => {
    ui.display.render('Lima', { temperature: 18, humidity: 80, precipitation: 0.2 });
    ui.display.clear();
    expect(ui.display.isEmpty()).toBe(true);
    expect(ui.container.textContent).toBe('');
  });

  it('un nombre con HTML se muestra como texto, no se interpreta', () => {
    ui.display.render('<img src=x onerror=alert(1)>', { temperature: 1, humidity: 1, precipitation: 1 });
    expect(ui.container.querySelector('img')).toBeNull();
    expect(ui.container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
