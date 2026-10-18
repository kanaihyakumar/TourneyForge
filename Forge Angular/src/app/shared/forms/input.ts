import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { provideValueAccessor, ValueControl } from './value-control';

@Component({
  selector: 'tf-input',
  providers: [provideValueAccessor(() => Input)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #control
      [id]="inputId()"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [required]="required()"
      [disabled]="disabled()"
      [attr.min]="min()"
      [attr.max]="max()"
      [attr.autocomplete]="autocomplete()"
      [attr.aria-label]="ariaLabel() || null"
      (input)="commit(control.value)"
      (blur)="onTouched()"
    />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      @include field-well;
    }

    input {
      @include field-control;
    }
  `,
})
export class Input extends ValueControl<string> {
  readonly inputId = input('');
  readonly type = input<'text' | 'number' | 'password' | 'date' | 'time'>('text');
  readonly placeholder = input('');
  readonly required = input(false, { transform: booleanAttribute });
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly ariaLabel = input('');

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  protected emptyValue(): string {
    return '';
  }

  focus(): void {
    this.control().nativeElement.focus();
  }
}
