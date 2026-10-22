import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatHumidity, formatPrecipitation, formatTemperature } from './formatters';

/** Cantidad de dígitos después del punto decimal (0 si no hay punto). */
function decimals(text: string): number {
  const match = /\.(\d+)/.exec(text);
  return match ? match[1].length : 0;
}

describe('formatters — Propiedad 11', () => {
  // Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima
  it('Propiedad 11: temperatura y precipitación con máximo 1 decimal y su unidad', () => {
    fc.assert(
      fc.property(fc.float(), fc.float(), (temperature, precipitation) => {
        const t = formatTemperature(temperature);
        const p = formatPrecipitation(precipitation);
        expect(t.endsWith(' °C')).toBe(true);
        expect(p.endsWith(' mm')).toBe(true);
        expect(decimals(t)).toBeLessThanOrEqual(1);
        expect(decimals(p)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima
  it('Propiedad 11: humedad como entero, sin punto decimal', () => {
    fc.assert(
      fc.property(fc.float(), (humidity) => {
        const h = formatHumidity(humidity);
        expect(h.endsWith(' %')).toBe(true);
        expect(h).not.toContain('.');
      }),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima
  it('Propiedad 11: en el rango realista el valor mostrado es el valor redondeado', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -90, max: 60, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 500, noNaN: true }),
        (temperature, humidity, precipitation) => {
          expect(Math.abs(parseFloat(formatTemperature(temperature)) - temperature)).toBeLessThanOrEqual(0.05 + 1e-6);
          expect(parseInt(formatHumidity(humidity), 10)).toBe(Math.round(humidity));
          expect(Math.abs(parseFloat(formatPrecipitation(precipitation)) - precipitation)).toBeLessThanOrEqual(0.05 + 1e-6);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('formatters — ejemplos de la tabla de formateo', () => {
  it('8.4 → "8.4 °C"', () => expect(formatTemperature(8.4)).toBe('8.4 °C'));
  it('72 → "72 %"', () => expect(formatHumidity(72)).toBe('72 %'));
  it('0 → "0.0 mm"', () => expect(formatPrecipitation(0)).toBe('0.0 mm'));
  it('23.456 → "23.5 °C"', () => expect(formatTemperature(23.456)).toBe('23.5 °C'));
  it('68.9 → "69 %"', () => expect(formatHumidity(68.9)).toBe('69 %'));
  it('-0.04 → "0.0 °C" (nunca "-0.0")', () => expect(formatTemperature(-0.04)).toBe('0.0 °C'));
  it('-3.25 → "-3.3 °C" o "-3.2 °C" (los negativos reales se conservan)', () =>
    expect(formatTemperature(-3.25)).toMatch(/^-3\.[23] °C$/));
});
