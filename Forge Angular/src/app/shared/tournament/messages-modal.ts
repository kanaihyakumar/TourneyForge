import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  resource,
} from '@angular/core';
import { TournamentService } from '../../core/services/tournament.service';
import { Modal } from '../ui/modal';
import { MessagesList } from './messages-list';

@Component({
  selector: 'tf-messages-modal',
  imports: [Modal, MessagesList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="'💬 Suggested messages - ' + (tournament.value()?.title ?? '')"
      [maxWidth]="720"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      @if (tournament.value(); as t) {
        <tf-messages-list [tournament]="t" />
      }
    </tf-modal>
  `,
})
export class MessagesModal {
  private readonly tournaments = inject(TournamentService);

  readonly tournamentId = model<string | null>(null);

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });
  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }
}
