import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tf-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'tone()', '[class.flush]': 'flush()', '[class.spread]': 'spread()' },
  template: `
    <span class="icon">{{ icon() }}</span>
    <span class="body"><ng-content /></span>
    <ng-content select="[bannerAside]" />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      @include neu-well(4px);
      padding: 14px 18px;
      font-weight: 700;
      font-size: 0.92rem;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 18px;
    }

    :host(.warn) {
      color: var(--danger);
    }

    :host(.ok) {
      color: var(--success);
    }

    :host(.flush) {
      margin: 0 0 12px;
    }

    :host(.spread) {
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .icon {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .body {
      flex: 1;
    }
  `,
})
export class Banner {
  readonly tone = input<'ok' | 'warn'>('ok');
  readonly icon = input('');
  readonly flush = input(false, { transform: booleanAttribute });
  readonly spread = input(false, { transform: booleanAttribute });
}
