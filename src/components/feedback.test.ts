import { describe, expect, it } from 'vitest';
import { LoadingIndicator } from './LoadingIndicator';
import { ErrorMessage } from './ErrorMessage';

describe('LoadingIndicator', () => {
  it('inicia oculto, y show()/hide() controlan su visibilidad', () => {
    const element = document.createElement('div');
    const loading = new LoadingIndicator(element);
    expect(loading.isVisible()).toBe(false);
    loading.show();
    expect(loading.isVisible()).toBe(true);
    expect(element.getAttribute('role')).toBe('status');
    loading.hide();
    expect(element.hidden).toBe(true);
  });
});

describe('ErrorMessage', () => {
  it('show() muestra el mensaje como alerta y clear() lo limpia', () => {
    const element = document.createElement('p');
    const error = new ErrorMessage(element);
    expect(element.hidden).toBe(true);
    error.show('No se encontró la ciudad ingresada. Verifica el nombre e intenta de nuevo.');
    expect(element.hidden).toBe(false);
    expect(element.getAttribute('role')).toBe('alert');
    expect(error.text).toContain('No se encontró la ciudad');
    error.clear();
    expect(error.text).toBe('');
    expect(element.hidden).toBe(true);
  });
});
