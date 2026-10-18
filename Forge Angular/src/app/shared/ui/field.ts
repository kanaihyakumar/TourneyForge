import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tf-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label()) {
      <label [attr.for]="for()" [class.small]="small()">
        {{ label() }}
        @if (hint()) {
          <span class="soft">{{ hint() }}</span>
        }
      </label>
    }
    <ng-content />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }

    label {
      @include form-label;
    }

    label.small {
      font-size: 0.8rem;
    }

    .soft {
      font-weight: 600;
      color: var(--text-soft);
    }
  `,
})
export class Field {
  readonly label = input('');
  readonly hint = input('');
  readonly for = input('');
  readonly small = input(false, { transform: booleanAttribute });
}
