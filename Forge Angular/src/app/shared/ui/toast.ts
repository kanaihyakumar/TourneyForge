import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'tf-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    '[class.show]': 'toast.visible()',
    '[class.accent]': "toast.tone() === 'accent'",
  },
  template: '{{ toast.message() }}',
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: 28px;
      transform: translate(-50%, 20px);
      background: var(--text);
      color: #fff;
      font-weight: 800;
      font-size: 0.88rem;
      padding: 12px 20px;
      border-radius: var(--radius-pill);
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 0.18s ease,
        transform 0.18s ease;
      z-index: 60;
      box-shadow: 0 10px 24px var(--toast-shadow);
    }

    :host(.accent) {
      background: var(--accent);
      box-shadow: 0 10px 24px var(--accent-glow);
    }

    :host(.show) {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  `,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
