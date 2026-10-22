import { beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { fireEvent, getByRole, within } from '@testing-library/dom';
import { CitySearchForm, MAX_CITY_LENGTH } from './CitySearchForm';

const VALIDATION = 'El nombre de la ciudad es obligatorio.';
const whitespace = (minLength = 0) =>
  fc.string({ unit: fc.constantFrom(' ', '\t', '\n', '\r'), minLength, maxLength: 20 });

function mount() {
  document.body.innerHTML = '<section id="search"></section>';
  const container = document.getElementById('search')!;
  const onSearch = vi.fn();
  const form = new CitySearchForm(container, onSearch);
  const input = getByRole(container, 'textbox', { name: 'Nombre de la ciudad' }) as HTMLInputElement;
  const button = getByRole(container, 'button', { name: 'Buscar' });
  return { container, form, onSearch, input, button };
}

describe('CitySearchForm — propiedades', () => {
  // Feature: weather-forecast-app, Propiedad 1: Rechazo de entradas de solo whitespace
  it('Propiedad 1: cualquier entrada de solo espacios (incluida la vacía) se rechaza sin emitir onSearch', () => {
    fc.assert(
      fc.property(whitespace(), fc.boolean(), (value, useEnter) => {
        const { onSearch, input, button, container } = mount();
        input.value = value;
        if (useEnter) fireEvent.keyDown(input, { key: 'Enter' });
        else fireEvent.click(button);
        expect(onSearch).not.toHaveBeenCalled();
        expect(within(container).getByText(VALIDATION)).toBeTruthy();
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 2: Trim del nombre de ciudad antes de enviar
  it('Propiedad 2: onSearch recibe exactamente cityName.trim()', () => {
    fc.assert(
      fc.property(
        whitespace(),
        fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
        whitespace(),
        (left, core, right) => {
          const { onSearch, input, button } = mount();
          input.value = left + core + right;
          fireEvent.click(button);
          expect(onSearch).toHaveBeenCalledTimes(1);
          expect(onSearch).toHaveBeenCalledWith((left + core + right).trim());
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('CitySearchForm — pruebas unitarias', () => {
  let ui: ReturnType<typeof mount>;
  beforeEach(() => {
    ui = mount();
  });

  it('renderiza City_Input con maxlength=100', () => {
    expect(ui.input.getAttribute('maxlength')).toBe(String(MAX_CITY_LENGTH));
    expect(ui.input.maxLength).toBe(100);
  });

  it('envía la búsqueda con clic en el botón', () => {
    ui.input.value = 'Arequipa';
    fireEvent.click(ui.button);
    expect(ui.onSearch).toHaveBeenCalledWith('Arequipa');
  });

  it('envía la búsqueda con Enter en City_Input, una sola vez', () => {
    ui.input.value = 'Lima';
    const notCancelled = fireEvent.keyDown(ui.input, { key: 'Enter' });
    expect(ui.onSearch).toHaveBeenCalledTimes(1);
    expect(ui.onSearch).toHaveBeenCalledWith('Lima');
    // Se cancela el envío implícito del navegador para no duplicar la búsqueda
    expect(notCancelled).toBe(false);
  });

  it('otras teclas no disparan la búsqueda', () => {
    ui.input.value = 'Lima';
    fireEvent.keyDown(ui.input, { key: 'a' });
    expect(ui.onSearch).not.toHaveBeenCalled();
  });

  it('el envío del formulario no recarga la página', () => {
    ui.input.value = 'Lima';
    const notCancelled = fireEvent.submit(ui.form.form);
    expect(notCancelled).toBe(false);
  });

  it('City_Input permanece accesible después de un error', () => {
    fireEvent.click(ui.button); // error de validación
    ui.form.focus();
    expect(ui.input.disabled).toBe(false);
    expect(document.activeElement).toBe(ui.input);
  });

  it('el mensaje de validación se limpia al enviar una ciudad válida', () => {
    fireEvent.click(ui.button);
    expect(ui.form.validation.textContent).toBe(VALIDATION);
    ui.input.value = 'Cusco';
    fireEvent.click(ui.button);
    expect(ui.form.validation.textContent).toBe('');
    expect(ui.input.hasAttribute('aria-invalid')).toBe(false);
  });
});
