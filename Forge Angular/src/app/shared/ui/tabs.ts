import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { PillButton } from './pill-button';

export interface TabItem {
  id: string;
  label: string;
  hidden?: boolean;
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
          </button>
        }
      }
    </div>
  `,
  styles: `
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
