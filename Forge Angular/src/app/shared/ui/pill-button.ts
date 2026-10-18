import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'button[tfPill]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.active]': 'active()' },
  styles: `
    @use 'mixins' as *;

    :host {
      @include reset-button;
      @include neu-surface(5px, var(--radius-pill));
      font-weight: 800;
      font-size: 0.86rem;
      padding: 10px 18px;
      color: var(--text-soft);
      transition:
        box-shadow 0.12s ease,
        color 0.12s ease;
    }

    :host(.active) {
      color: var(--accent-dark);
      @include neu-inset(4px);
    }
  `,
})
export class PillButton {
  readonly active = input(false, { transform: booleanAttribute });
}
