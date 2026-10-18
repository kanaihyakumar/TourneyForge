import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { provideValueAccessor, ValueControl } from './value-control';

export type CheckboxVariant = 'plain' | 'chip' | 'toggle';

@Component({
  selector: 'tf-checkbox',
  providers: [provideValueAccessor(() => Checkbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'variant()' },
  template: `
    <label>
      <input
        #control
        type="checkbox"
        [checked]="value()"
        [disabled]="disabled()"
        (change)="commit(control.checked)"
        (blur)="onTouched()"
      />
      <span><ng-content /></span>
    </label>
  `,
  styles: `
    @use 'mixins' as *;

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 800;
      font-size: 0.85rem;
      color: var(--text);
    }

    input {
      width: auto;
      accent-color: var(--accent);
    }

    :host(.chip) label {
      @include neu-surface(4px, var(--radius-pill));
      padding: 8px 8px 8px 16px;
      font-weight: 700;
      font-size: 0.88rem;
      flex-direction: row;
    }

    :host(.toggle) label {
      font-weight: 700;
      font-size: 0.86rem;
      color: var(--text-soft);
    }
  `,
})
export class Checkbox extends ValueControl<boolean> {
  readonly variant = input<CheckboxVariant>('plain');

  protected emptyValue(): boolean {
    return false;
  }
}
