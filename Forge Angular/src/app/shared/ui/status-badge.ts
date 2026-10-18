import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { STATUS_LABELS } from '../../core/config/constants';
import { TournamentStatus } from '../../core/models/models';
import { Badge, BadgeTone } from './badge';

const STATUS_TONES: Record<TournamentStatus, BadgeTone> = {
  ongoing: 'live',
  upcoming: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
};

@Component({
  selector: 'tf-status-badge',
  imports: [Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<tf-badge [tone]="tone()">{{ label() }}</tf-badge>`,
})
export class StatusBadge {
  readonly status = input.required<TournamentStatus>();
  readonly short = input(false, { transform: booleanAttribute });

  protected readonly tone = computed(() => STATUS_TONES[this.status()]);
  protected readonly label = computed(
    () => STATUS_LABELS[this.status()][this.short() ? 'short' : 'long'],
  );
}
