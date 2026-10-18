import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tf-well',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.soft]': 'soft()' },
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      @include neu-well(5px);
      padding: 14px 16px;
      white-space: pre-wrap;
      font-weight: 600;
      margin-bottom: 12px;
    }

    :host(.soft) {
      font-size: 0.88rem;
      color: var(--text-soft);
    }
  `,
})
export class Well {
  readonly soft = input(false, { transform: booleanAttribute });
}
