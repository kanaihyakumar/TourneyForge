import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tf-list-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="main">
      <div class="title"><ng-content select="[rowTitle]" /></div>
      <div class="sub"><ng-content select="[rowSub]" /></div>
    </div>
    <div class="actions"><ng-content select="[rowActions]" /></div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      padding: 14px 16px;
      @include neu-surface(5px);
      margin-bottom: 12px;
    }

    .main {
      flex: 1 1 220px;
      min-width: 0;
    }

    .title {
      font-weight: 900;
      font-size: 0.98rem;
    }

    .sub {
      font-size: 0.8rem;
      color: var(--text-soft);
      font-weight: 700;
      margin-top: 2px;
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    @media (max-width: 480px) {
      :host {
        flex-direction: column;
        align-items: stretch;
      }

      .actions {
        justify-content: flex-start;
      }
    }
  `,
})
export class ListRow {}
