// Reglas de formateo (design.md → Reglas de Formateo para la Presentación)

const LARGE = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 0 });

/**
 * `toFixed` seguro: para |valor| ≥ 1e21 `toFixed` usa notación exponencial
 * (p. ej. "3.4028234663852886e+38"), que rompería la regla de "máximo 1 decimal".
 * También evita mostrar el cero negativo ("-0.0").
 */
function toFixedSafe(value: number, digits: number): string {
  if (!Number.isFinite(value)) return String(value);
  const text =
    Math.abs(value) < 1e21
      ? value.toFixed(digits)
      : LARGE.format(value) + (digits > 0 ? '.' + '0'.repeat(digits) : '');
  return /^-0(\.0+)?$/.test(text) ? text.slice(1) : text;
}

/** Temperatura: máximo 1 decimal + "°C" (ej. 8.4 °C). */
export function formatTemperature(value: number): string {
  return `${toFixedSafe(value, 1)} °C`;
}

/** Humedad: entero sin decimales + "%" (ej. 72 %). */
export function formatHumidity(value: number): string {
  return `${toFixedSafe(Math.round(value), 0)} %`;
}

/** Precipitación: máximo 1 decimal + "mm" (ej. 0.0 mm). */
export function formatPrecipitation(value: number): string {
  return `${toFixedSafe(value, 1)} mm`;
}
