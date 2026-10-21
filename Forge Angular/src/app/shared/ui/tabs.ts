import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { PillButton } from './pill-button';

export interface TabItem {
  id: string;
  label: string;
  hidden?: boolean;
  badge?: number;
}

@Component({
  selector: 'tf-tabs',
  imports: [PillButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-row" role="tablist">
      @for (tab of tabs(); track tab.id) {
        @if (!tab.hidden) {
          <button
            type="button"
            tfPill
            role="tab"
            [active]="active() === tab.id"
            [attr.aria-selected]="active() === tab.id"
            (click)="active.set(tab.id)"
          >
            {{ tab.label }}
            @if (tab.badge) {
              <span class="badge">{{ tab.badge }}</span>
            }
          </button>
        }
      }
    </div>
  `,
  styles: `
    .badge {
      display: inline-block;
      min-width: 18px;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: var(--radius-pill);
      background: var(--danger);
      color: var(--accent-contrast);
      font-size: 0.7rem;
      line-height: 1.4;
      text-align: center;
    }

    .tab-row {
      display: flex;
      gap: 10px;
      margin: 4px 0 18px;
      flex-wrap: wrap;
    }
  `,
})
export class Tabs {
  readonly tabs = input.required<TabItem[]>();
  readonly active = model.required<string>();
}
