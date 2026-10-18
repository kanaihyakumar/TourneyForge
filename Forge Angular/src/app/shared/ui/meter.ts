import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'tf-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'level()' },
  template: `
    <div class="row">
      <span class="label">{{ label() }}</span>
      <span class="value">{{ valueText() }}</span>
    </div>
    <div
      class="track"
      role="progressbar"
      [attr.aria-valuenow]="percent()"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="fill" [style.width.%]="percent()"></div>
    </div>
    @if (note()) {
      <p class="note">{{ note() }}</p>
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      margin-bottom: 16px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-weight: 800;
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .value {
      color: var(--text-soft);
    }

    .track {
      @include neu-well(3px, var(--radius-pill));
      height: 16px;
      padding: 3px;
    }

    .fill {
      height: 100%;
      border-radius: var(--radius-pill);
      background: var(--success);
      min-width: 2px;
      transition: width 0.3s ease;
    }

    :host(.warn) .fill {
      background: var(--warn);
    }

    :host(.full) .fill {
      background: var(--danger);
    }

    :host(.full) .value {
      color: var(--danger);
    }

    .note {
      margin: 6px 2px 0;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-soft);
    }
  `,
})
export class Meter {
  readonly label = input.required<string>();
  readonly valueText = input.required<string>();
  readonly used = input.required<number>();
  readonly limit = input.required<number>();
  readonly warnRatio = input(0.8);
  readonly note = input('');

  protected readonly percent = computed(() =>
    Math.min(100, Math.round((this.used() / this.limit()) * 1000) / 10),
  );
  protected readonly level = computed(() =>
    this.used() >= this.limit()
      ? 'full'
      : this.used() >= this.limit() * this.warnRatio()
        ? 'warn'
        : 'ok',
  );
}
