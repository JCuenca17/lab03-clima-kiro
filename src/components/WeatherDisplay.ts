import type { WeatherData } from '../types';
import { formatHumidity, formatPrecipitation, formatTemperature } from '../utils/formatters';

/** Muestra ciudad, temperatura (°C), humedad (%) y precipitación (mm) — Requisito 4. */
export class WeatherDisplay {
  constructor(private readonly container: HTMLElement) {}

  /**
   * @param cityName  nombre retornado por la Geocoding API
   * @param fallbackName  nombre ingresado por el usuario, si la API no trae nombre (Req. 4.7)
   */
  render(cityName: string, weather: WeatherData, fallbackName = ''): void {
    const card = document.createElement('article');
    card.className = 'weather-card';

    const title = document.createElement('h2');
    title.className = 'city-name';
    title.textContent = cityName.trim().length > 0 ? cityName : fallbackName;

    const list = document.createElement('dl');
    const metrics: Array<[string, string, string]> = [
      ['temperature', 'Temperatura', formatTemperature(weather.temperature)],
      ['humidity', 'Humedad relativa', formatHumidity(weather.humidity)],
      ['precipitation', 'Precipitación', formatPrecipitation(weather.precipitation)],
    ];
    for (const [key, label, value] of metrics) {
      const item = document.createElement('div');
      item.className = `metric metric-${key}`;
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.dataset.testid = key;
      dd.textContent = value; // textContent: nunca se interpreta como HTML
      item.append(dt, dd);
      list.append(item);
    }

    card.append(title, list);
    this.container.replaceChildren(card);
  }

  /** Limpia el contenido al iniciar una nueva búsqueda (Requisito 4.6). */
  clear(): void {
    this.container.replaceChildren();
  }

  isEmpty(): boolean {
    return this.container.childElementCount === 0;
  }
}
