import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'default' | 'primary' | 'danger';
export type ButtonSize = 'md' | 'sm';

@Component({
  selector: 'button[tfButton], a[tfButton]',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.primary]': "variant() === 'primary'",
    '[class.danger]': "variant() === 'danger'",
    '[class.sm]': "size() === 'sm'",
    '[class.block]': 'block()',
  },
  styles: `
    @use 'mixins' as *;

    :host {
      @include reset-button;
      @include neu-surface(6px);
      font-weight: 800;
      font-size: 0.92rem;
      padding: 13px 22px;
      color: var(--text);
      transition:
        box-shadow 0.12s ease,
        transform 0.12s ease,
        color 0.12s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      text-decoration: none;
    }

    :host(:hover) {
      @include neu-raised(4px);
    }

    :host(:active) {
      @include neu-inset(4px);
      transform: translateY(1px);
    }

    :host(.primary) {
      background: var(--accent);
      color: var(--accent-contrast);
      box-shadow:
        6px 6px 14px var(--accent-shadow-dark),
        -6px -6px 14px var(--shadow-light);
    }

    :host(.primary:hover) {
      background: var(--accent-dark);
    }

    :host(.primary:active) {
      box-shadow:
        inset 4px 4px 8px var(--accent-inset-dark),
        inset -4px -4px 8px var(--accent-inset-light);
    }

    :host(.danger) {
      color: var(--danger);
    }

    :host(.block) {
      width: 100%;
    }

    :host(.sm) {
      padding: 9px 14px;
      font-size: 0.82rem;
    }

    :host(:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });
}
