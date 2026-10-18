import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Chip } from './chip';

@Component({
  selector: 'tf-chip-list',
  imports: [Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul>
      @for (item of items(); track $index) {
        <li>
          <tf-chip
            [removable]="removable()"
            [replaceable]="replaceable()"
            [label]="item"
            (removed)="removed.emit($index)"
            (replace)="replace.emit($index)"
            >{{ item }}</tf-chip
          >
        </li>
      } @empty {
        @if (emptyText()) {
          <li class="empty-note">{{ emptyText() }}</li>
        }
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
  `,
})
export class ChipList {
  readonly items = input.required<string[]>();
  readonly removable = input(false, { transform: booleanAttribute });
  readonly emptyText = input('');
  readonly replaceable = input(false, { transform: booleanAttribute });
  readonly removed = output<number>();
  readonly replace = output<number>();
}
