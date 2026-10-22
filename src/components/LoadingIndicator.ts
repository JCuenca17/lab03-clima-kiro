/** Indicador de carga mientras hay una solicitud en curso (Requisito 4.5). */
export class LoadingIndicator {
  constructor(private readonly element: HTMLElement) {
    this.element.setAttribute('role', 'status');
    this.element.classList.add('loading');
    if (!this.element.textContent) this.element.textContent = 'Consultando el clima…';
    this.hide();
  }

  show(): void {
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  isVisible(): boolean {
    return !this.element.hidden;
  }
}
