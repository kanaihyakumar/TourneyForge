import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { INSTALL_GUIDE } from '../core/config/install';
import { InstallService } from '../core/services/install.service';
import { Button } from '../shared/ui/button';

@Component({
  selector: 'tf-install-app',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (install.available()) {
      @if (variant() === 'card' && install.promoVisible()) {
        <section class="card" aria-label="Get the app">
          <span class="icon" aria-hidden="true">📲</span>
          <div class="text">
            <strong>{{ guide.cardTitle }}</strong>
            <span>{{ guide.cardText }}</span>
          </div>
          <div class="actions">
            <button type="button" tfButton variant="primary" size="sm" (click)="install.start()">
              📲 Get the app
            </button>
            <button
              type="button"
              class="later"
              aria-label="Hide for now"
              (click)="install.snoozePromo()"
            >
              Not now
            </button>
          </div>
        </section>
      } @else if (variant() === 'button') {
        <button type="button" tfButton size="sm" (click)="install.start()">📲 Get the app</button>
      }
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: contents;
    }

    .card {
      @include neu-surface(6px, var(--radius-lg));
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .icon {
      font-size: 1.8rem;
    }

    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 220px;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.45;
      color: var(--text-soft);
    }

    .text strong {
      font-size: 0.98rem;
      font-weight: 900;
      color: var(--text);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    @media (max-width: 640px) {
      .card {
        gap: 10px;
        padding: 10px 14px;
        margin-bottom: 16px;
      }

      .icon {
        font-size: 1.4rem;
      }

      .text {
        min-width: 0;
      }

      .text span {
        display: none;
      }

      .actions {
        margin-left: auto;
        gap: 8px;
      }
    }

    .later {
      @include reset-button;
      background: none;
      padding: 4px 2px;
      font-size: 0.76rem;
      font-weight: 800;
      color: var(--text-soft);
    }
  `,
})
export class InstallApp {
  protected readonly install = inject(InstallService);
  protected readonly guide = INSTALL_GUIDE;

  readonly variant = input<'card' | 'button'>('button');
}
