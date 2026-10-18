import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'tf-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span><ng-content /></span>
    @if (replaceable()) {
      <button
        type="button"
        class="replace"
        [attr.aria-label]="'Replace ' + label()"
        (click)="replace.emit()"
      >
        🔁
      </button>
    }
    @if (removable()) {
      <button type="button" [attr.aria-label]="'Remove ' + label()" (click)="removed.emit()">
        ×
      </button>
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 16px;
      @include neu-surface(4px, var(--radius-pill));
      font-weight: 700;
      font-size: 0.88rem;
    }

    button {
      @include reset-button;
      @include neu-well(2px, 50%);
      width: 24px;
      height: 24px;
      color: var(--danger);
      font-weight: 900;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }

    .replace {
      color: var(--accent-dark);
      font-size: 11px;
    }

    button:hover {
      color: #fff;
      background: var(--danger);
      box-shadow: none;
    }

    .replace:hover {
      background: var(--accent);
    }
  `,
})
export class Chip {
  readonly removable = input(false, { transform: booleanAttribute });
  readonly replaceable = input(false, { transform: booleanAttribute });
  readonly replace = output<void>();
  readonly label = input('');
  readonly removed = output<void>();
}
