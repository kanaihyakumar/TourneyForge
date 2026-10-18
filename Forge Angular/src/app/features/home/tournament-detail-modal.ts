import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  resource,
} from '@angular/core';
import { TournamentService } from '../../core/services/tournament.service';
import { isFull, isOpenForRegistration } from '../../core/utils/tournament';
import { TournamentCredits } from '../../shared/tournament/tournament-credits';
import { TournamentResults } from '../../shared/tournament/tournament-results';
import { TournamentTags } from '../../shared/tournament/tournament-tags';
import { Banner } from '../../shared/ui/banner';
import { Modal } from '../../shared/ui/modal';
import { StatusBadge } from '../../shared/ui/status-badge';
import { Well } from '../../shared/ui/well';
import { RegisterForm } from './register-form';

@Component({
  selector: 'tf-tournament-detail-modal',
  imports: [
    Modal,
    StatusBadge,
    TournamentTags,
    TournamentResults,
    TournamentCredits,
    Well,
    Banner,
    RegisterForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="tournament.value()?.title ?? ''"
      [maxWidth]="620"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      @if (tournament.value(); as t) {
        <div class="tags">
          <tf-status-badge [status]="t.status" />
          <tf-tournament-tags [tournament]="t" showSettings />
        </div>
        <tf-tournament-results [tournament]="t" />
        <tf-well>{{ t.announcement }}</tf-well>
        @if (t.details) {
          <tf-well soft>{{ t.details }}</tf-well>
        }
        <tf-tournament-credits [tournament]="t" />
        @if (alreadyRegistered()) {
          <tf-banner icon="✅">You’re already registered for this tournament. Good luck!</tf-banner>
        }
        @if (canRegister()) {
          <tf-register-form
            [tournament]="t"
            [autofocus]="focusRegister()"
            (registered)="registered.emit()"
          />
        } @else if (isOpen() && full() && !alreadyRegistered()) {
          <tf-banner tone="warn" icon="⚠️">All slots are full for this tournament.</tf-banner>
        }
      }
    </tf-modal>
  `,
  styles: `
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
  `,
})
export class TournamentDetailModal {
  private readonly tournaments = inject(TournamentService);

  readonly tournamentId = model<string | null>(null);
  readonly focusRegister = input(false);
  readonly registered = output<void>();

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });

  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());
  protected readonly alreadyRegistered = computed(() => {
    const t = this.tournament.value();
    return !!t && this.tournaments.myRegistrations().includes(t.id);
  });
  protected readonly isOpen = computed(() => {
    const t = this.tournament.value();
    return !!t && isOpenForRegistration(t);
  });
  protected readonly full = computed(() => {
    const t = this.tournament.value();
    return !!t && isFull(t);
  });
  protected readonly canRegister = computed(
    () => this.isOpen() && !this.full() && !this.alreadyRegistered(),
  );

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }
}
