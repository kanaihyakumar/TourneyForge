import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SelectOption } from '../../core/models/models';
import { provideValueAccessor, ValueControl } from './value-control';

@Component({
  selector: 'tf-select',
  providers: [provideValueAccessor(() => Select)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
  template: `
    <select
      #control
      [id]="inputId()"
      [disabled]="disabled()"
      (change)="commit(control.value)"
      (blur)="onTouched()"
    >
      @for (option of options(); track option.value) {
        <option [value]="option.value" [selected]="option.value === value()">
          {{ option.label }}
        </option>
      }
    </select>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      @include field-well;
    }

    select {
      @include field-control;
    }

    :host(.compact) {
      @include neu-well(3px, var(--radius-pill));
    }

    @media (max-width: 480px) {
      :host(.compact) {
        max-width: 190px;
      }

      :host(.compact) select {
        text-overflow: ellipsis;
      }
    }

    :host(.compact) select {
      padding: 8px 14px;
      font-size: 0.82rem;
      font-weight: 800;
      border-radius: var(--radius-pill);
    }
  `,
})
export class Select extends ValueControl<string> {
  readonly inputId = input('');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly options = input.required<SelectOption[]>();

  protected emptyValue(): string {
    return '';
  }
}
