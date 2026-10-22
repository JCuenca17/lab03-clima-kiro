/** Zona de mensajes de error de la UI. */
export class ErrorMessage {
  constructor(private readonly element: HTMLElement) {
    this.element.setAttribute('role', 'alert');
    this.element.classList.add('error-message');
    this.clear();
  }

  show(message: string): void {
    this.element.textContent = message;
    this.element.hidden = false;
  }

  clear(): void {
    this.element.textContent = '';
    this.element.hidden = true;
  }

  get text(): string {
    return this.element.textContent ?? '';
  }
}
