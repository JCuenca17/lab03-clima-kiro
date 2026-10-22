import { MESSAGES } from '../utils/errorMessages';

export const MAX_CITY_LENGTH = 100;

/**
 * Formulario de búsqueda: City_Input (maxlength=100), botón de envío y
 * validación inline de entradas vacías o de solo espacios (Requisito 1).
 */
export class CitySearchForm {
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly button: HTMLButtonElement;
  readonly validation: HTMLElement;

  constructor(
    container: HTMLElement,
    private readonly onSearch: (cityName: string) => void,
  ) {
    this.form = document.createElement('form');
    this.form.className = 'search-form';
    this.form.setAttribute('role', 'search');
    this.form.noValidate = true;

    const label = document.createElement('label');
    label.htmlFor = 'city-input';
    label.textContent = 'Nombre de la ciudad';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = 'city-input';
    this.input.name = 'city';
    this.input.maxLength = MAX_CITY_LENGTH;
    this.input.placeholder = 'Ej: Arequipa, Lima, Cusco';
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-describedby', 'city-validation');

    this.button = document.createElement('button');
    this.button.type = 'submit';
    this.button.textContent = 'Buscar';

    this.validation = document.createElement('p');
    this.validation.id = 'city-validation';
    this.validation.className = 'validation';
    this.validation.setAttribute('aria-live', 'polite');

    const row = document.createElement('div');
    row.className = 'search-row';
    row.append(this.input, this.button);
    this.form.append(label, row, this.validation);
    container.replaceChildren(this.form);

    // Clic en el botón (o envío del formulario)
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });

    // Tecla Enter en City_Input. Se cancela el envío implícito del navegador
    // para que un Enter produzca una sola búsqueda.
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submit();
      }
    });
  }

  /** Valida y emite `onSearch` con el valor recortado (Requisitos 1.3, 1.4, 1.5). */
  submit(): void {
    const cityName = this.input.value.trim();
    if (cityName.length === 0) {
      this.showValidation(MESSAGES.VALIDATION_EMPTY);
      return;
    }
    this.clearValidation();
    this.onSearch(cityName);
  }

  showValidation(message: string): void {
    this.validation.textContent = message;
    this.input.setAttribute('aria-invalid', 'true');
  }

  clearValidation(): void {
    this.validation.textContent = '';
    this.input.removeAttribute('aria-invalid');
  }

  /** Mantiene City_Input accesible para reintentar (Requisito 1.6). */
  focus(): void {
    this.input.disabled = false;
    this.input.focus();
  }
}
