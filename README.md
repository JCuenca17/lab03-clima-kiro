# Clima actual — weather-forecast-app

Aplicación web (SPA) que recibe el nombre de una ciudad, obtiene sus coordenadas con la
[Geocoding API de Open-Meteo](https://open-meteo.com/en/docs/geocoding-api) y consulta el clima
actual (temperatura, humedad relativa y precipitación) con la
[Forecast API](https://open-meteo.com/en/docs).

Proyecto del **Laboratorio 03 — Spec-Driven Development con Kiro**. El desarrollo siguió el flujo
*Specify → Plan → Implement → Validate*: la especificación es la fuente de verdad y el código se
construyó tarea por tarea a partir de ella.

## Especificación (Kiro)

Los documentos del spec están en [`.kiro/specs/weather-forecast-app/`](.kiro/specs/weather-forecast-app):

| Documento | Fase | Contenido |
|---|---|---|
| [`requirements.md`](.kiro/specs/weather-forecast-app/requirements.md) | Specify | 5 requisitos con historias de usuario y criterios de aceptación (EARS) |
| [`design.md`](.kiro/specs/weather-forecast-app/design.md) | Plan | Arquitectura en capas, modelos de datos, manejo de errores y 13 propiedades de corrección |
| [`tasks.md`](.kiro/specs/weather-forecast-app/tasks.md) | Implement | Plan de implementación (todas las tareas completadas) |

## Ejecución

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
npm test           # pruebas unitarias, de propiedades y de integración
npm run coverage   # pruebas + reporte de cobertura
npm run build      # verificación de tipos + build de producción en dist/
```

## Arquitectura

```
Presentación   CitySearchForm · WeatherDisplay · LoadingIndicator · ErrorMessage
      │
Aplicación     WeatherController (orquesta el flujo y el estado de la UI)
      │
Servicios      GeocodingService · ForecastService (validación, parseo, errores)
      │
Clientes HTTP  GeocodingClient · ForecastClient (fetch + timeout de 10 s)
```

```
src/
├── clients/       GeocodingClient, ForecastClient, fetchWithTimeout, errores de red/timeout
├── services/      GeocodingService, ForecastService
├── components/    CitySearchForm, WeatherDisplay, LoadingIndicator, ErrorMessage
├── utils/         formatters (°C, %, mm) y mensajes de error
├── types/         tipos del dominio (Coordinates, WeatherData, AppState, ...)
├── WeatherController.ts
├── app.ts         composición de las capas
└── main.ts        punto de entrada
```

Stack: TypeScript (modo estricto) sin frameworks, Vite, Vitest, fast-check y Testing Library.

## Validación

- **13 propiedades de corrección** del diseño implementadas con *property-based testing*
  (fast-check, 100 iteraciones cada una), etiquetadas como
  `// Feature: weather-forecast-app, Propiedad N: ...`.
- Pruebas unitarias de cada capa y pruebas de integración de extremo a extremo con clientes
  HTTP simulados sobre el `index.html` real.
- 76 pruebas en total; cobertura de líneas del 100 %.

## Decisiones de implementación

Puntos donde la implementación precisa o corrige un detalle del spec:

- **Enter en el campo de búsqueda.** El diseño pide escuchar `submit` y `keydown` Enter. Como el
  navegador ya envía el formulario al presionar Enter, el manejador de `keydown` cancela ese envío
  implícito para que cada Enter produzca **una sola** búsqueda.
- **Formato numérico.** Se usa `toFixed`, como indica el diseño, pero normalizando el cero negativo
  (`-0.04` se muestra como `0.0 °C`, no `-0.0 °C`) y evitando la notación exponencial de `toFixed`
  para valores ≥ 1e21, que rompería la regla de "máximo 1 decimal" (Propiedad 11).
- **Respuestas con estructura inválida.** Un cuerpo 2xx sin el objeto esperado (`results` que no es
  arreglo, falta de `current`, valores no numéricos) se trata como `INVALID_RESPONSE`; los campos
  nulos o ausentes siguen el spec (`CITY_NOT_FOUND` en geocodificación, `INCOMPLETE_DATA` en el
  pronóstico).
- **Humedad.** Se usa el parámetro actual de la API, `relative_humidity_2m`, como indica la nota del
  diseño (el requirements menciona el nombre antiguo `relativehumidity_2m`).

Datos meteorológicos: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
