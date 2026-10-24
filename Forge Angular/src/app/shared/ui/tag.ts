import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tf-tag',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @use 'mixins' as *;

    :host {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--bg);
      @include neu-inset(2px);
      color: var(--accent-dark);
    }

    :host(.at-limit) {
      color: var(--danger);
    }
  `,
})
export class Tag {}
