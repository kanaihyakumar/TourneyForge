import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  title?: string;
}

@Component({
  selector: 'tf-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="group" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          class="seg"
          [class.on]="option.value === value()"
          [attr.aria-checked]="option.value === value()"
          [attr.title]="option.title ?? null"
          [disabled]="disabled()"
          (click)="option.value !== value() && picked.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: inline-block;
    }

    .group {
      @include neu-well(3px, var(--radius-pill));
      display: inline-flex;
      padding: 3px;
      gap: 2px;
    }

    .seg {
      @include reset-button;
      padding: 7px 12px;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-soft);
      white-space: nowrap;
    }

    .seg.on {
      @include neu-surface(3px, var(--radius-pill));
      color: var(--accent-dark);
    }

    .seg:disabled {
      opacity: 0.6;
    }
  `,
})
export class Segmented {
  readonly options = input.required<SegmentOption[]>();
  readonly value = input.required<string>();
  readonly label = input('');
  readonly disabled = input(false);
  readonly picked = output<string>();
}
