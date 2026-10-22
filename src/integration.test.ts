import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { createApp } from './app';
import { fakeResponse } from './test/helpers';
import html from '../index.html?raw';

// Se monta el <body> real de index.html para probar la SPA completa
const body = /<body>([\s\S]*)<\/body>/.exec(html)![1];

const AREQUIPA = { results: [{ name: 'Arequipa', latitude: -16.39889, longitude: -71.535, country: 'Peru' }] };
const CURRENT = { current: { temperature_2m: 19.34, relative_humidity_2m: 27, precipitation: 0 } };

function mountApp(geocodingResponse: () => Promise<Response>, forecastResponse: () => Promise<Response>) {
  document.body.innerHTML = body;
  const geocodingClient = { search: vi.fn(geocodingResponse) };
  const forecastClient = { fetchCurrent: vi.fn(forecastResponse) };
  createApp(document, { geocodingClient, forecastClient });
  const input = getByRole(document.body, 'textbox', { name: 'Nombre de la ciudad' }) as HTMLInputElement;
  const button = getByRole(document.body, 'button', { name: 'Buscar' });
  return {
    geocodingClient,
    forecastClient,
    input,
    button,
    display: document.getElementById('weather-display')!,
    error: document.getElementById('error-message')!,
    loading: document.getElementById('loading-indicator')!,
  };
}

describe('Integración de extremo a extremo (clientes HTTP simulados)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('flujo exitoso: búsqueda → geocoding → forecast → datos visibles en el DOM', async () => {
    const app = mountApp(async () => fakeResponse(AREQUIPA), async () => fakeResponse(CURRENT));

    app.input.value = '  Arequipa  ';
    fireEvent.click(app.button);

    await waitFor(() => expect(app.display.textContent).toContain('19.3 °C'));
    expect(app.geocodingClient.search).toHaveBeenCalledWith('Arequipa');
    expect(app.forecastClient.fetchCurrent).toHaveBeenCalledWith(-16.39889, -71.535);
    expect(app.display.textContent).toContain('Arequipa');
    expect(app.display.textContent).toContain('27 %');
    expect(app.display.textContent).toContain('0.0 mm');
    expect(app.loading.hidden).toBe(true);
    expect(app.error.hidden).toBe(true);
  });

  it('flujo exitoso con la tecla Enter', async () => {
    const app = mountApp(async () => fakeResponse(AREQUIPA), async () => fakeResponse(CURRENT));
    app.input.value = 'Arequipa';
    fireEvent.keyDown(app.input, { key: 'Enter' });
    await waitFor(() => expect(app.display.textContent).toContain('Arequipa'));
    expect(app.geocodingClient.search).toHaveBeenCalledTimes(1);
  });

  it('flujo de error: geocoding falla → mensaje visible y City_Input accesible', async () => {
    const app = mountApp(async () => fakeResponse({ generationtime_ms: 0.07 }), async () => fakeResponse(CURRENT));

    app.input.value = 'asdfghjk';
    fireEvent.click(app.button);

    await waitFor(() => expect(app.error.hidden).toBe(false));
    expect(app.error.textContent).toBe('No se encontró la ciudad ingresada. Verifica el nombre e intenta de nuevo.');
    expect(app.forecastClient.fetchCurrent).not.toHaveBeenCalled();
    expect(app.input.disabled).toBe(false);
    expect(document.activeElement).toBe(app.input);
    expect(app.loading.hidden).toBe(true);
  });

  it('flujo de error: el servicio de pronóstico responde HTTP 503', async () => {
    const app = mountApp(async () => fakeResponse(AREQUIPA), async () => fakeResponse(null, 503));
    app.input.value = 'Arequipa';
    fireEvent.click(app.button);
    await waitFor(() => expect(app.error.textContent).toBe('El servicio de pronóstico retornó un error.'));
    expect(app.display.textContent).toBe('');
  });

  it('el indicador de carga es visible mientras la solicitud está en curso', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const app = mountApp(
      async () => {
        await gate;
        return fakeResponse(AREQUIPA);
      },
      async () => fakeResponse(CURRENT),
    );
    app.input.value = 'Arequipa';
    fireEvent.click(app.button);
    expect(app.loading.hidden).toBe(false);
    release();
    await waitFor(() => expect(app.loading.hidden).toBe(true));
  });

  it('entrada vacía → validación inline y ninguna solicitud de red', () => {
    const app = mountApp(async () => fakeResponse(AREQUIPA), async () => fakeResponse(CURRENT));
    fireEvent.click(app.button);
    expect(document.getElementById('city-validation')?.textContent).toBe('El nombre de la ciudad es obligatorio.');
    expect(app.geocodingClient.search).not.toHaveBeenCalled();
  });
});
