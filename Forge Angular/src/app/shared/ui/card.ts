import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tf-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (title()) {
      <div class="head" [class.with-hint]="hint()" [class.flush]="flushHead()">
        <div>
          <h2>
            @if (icon()) {
              <span class="section-icon" aria-hidden="true">{{ icon() }}</span>
            }
            {{ title() }}
          </h2>
          @if (hint()) {
            <p class="hint">{{ hint() }}</p>
          }
        </div>
        <ng-content select="[cardAside]" />
      </div>
    }
    <ng-content />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      @include neu-surface(9px, var(--radius-lg));
      padding: clamp(18px, 3vw, 28px);
      margin-bottom: 24px;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .head.with-hint {
      margin-bottom: 18px;
    }

    .head.flush {
      margin-bottom: 0;
    }

    h2 {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .hint {
      margin: 4px 0 0;
    }

    .section-icon {
      display: inline-flex;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      align-items: center;
      justify-content: center;
      margin-right: 8px;
      font-size: 15px;
      @include neu-inset(3px);
      vertical-align: middle;
    }
  `,
})
export class Card {
  readonly title = input('');
  readonly icon = input('');
  readonly hint = input('');
  readonly flushHead = input(false, { transform: booleanAttribute });
}
