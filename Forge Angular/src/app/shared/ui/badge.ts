import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'live' | 'upcoming' | 'completed' | 'cancelled';

@Component({
  selector: 'tf-badge',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'tone()' },
  styles: `
    @use 'mixins' as *;

    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.74rem;
      font-weight: 900;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      letter-spacing: 0.3px;
      @include neu-inset(2px);
    }

    :host(.live) {
      color: var(--success);
    }

    :host(.upcoming) {
      color: var(--accent-dark);
    }

    :host(.completed) {
      color: var(--text-soft);
    }

    :host(.cancelled) {
      color: var(--danger);
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('upcoming');
}
