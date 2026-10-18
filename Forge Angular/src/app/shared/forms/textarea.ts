import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { provideValueAccessor, ValueControl } from './value-control';

@Component({
  selector: 'tf-textarea',
  providers: [provideValueAccessor(() => Textarea)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      #control
      [id]="inputId()"
      [value]="value()"
      [placeholder]="placeholder()"
      [required]="required()"
      [disabled]="disabled()"
      [style.min-height.px]="minHeight()"
      (input)="commit(control.value)"
      (blur)="onTouched()"
    ></textarea>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      @include field-well;
    }

    textarea {
      @include field-control;
      resize: vertical;
      line-height: 1.45;
    }
  `,
})
export class Textarea extends ValueControl<string> {
  readonly inputId = input('');
  readonly placeholder = input('');
  readonly required = input(false, { transform: booleanAttribute });
  readonly minHeight = input(76);

  protected emptyValue(): string {
    return '';
  }
}
