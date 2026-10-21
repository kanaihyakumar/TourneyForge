import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { TimezoneService } from '../../core/services/timezone.service';
import { TournamentService } from '../../core/services/tournament.service';
import { canManage, isFull, registrationNotOpenYet, timeUntil } from '../../core/utils/tournament';
import { TournamentCredits } from '../../shared/tournament/tournament-credits';
import { TournamentResults } from '../../shared/tournament/tournament-results';
import { TournamentTags } from '../../shared/tournament/tournament-tags';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { StatusBadge } from '../../shared/ui/status-badge';

@Component({
  selector: 'tf-tour-card',
  imports: [
    RouterLink,
    Button,
    Badge,
    StatusBadge,
    TournamentTags,
    TournamentResults,
    TournamentCredits,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tour-card.html',
  styleUrl: './tour-card.scss',
})
export class TourCard {
  private readonly auth = inject(AuthService);
  private readonly tournaments = inject(TournamentService);
  private readonly timezone = inject(TimezoneService);

  readonly tournament = input.required<Tournament>();
  readonly viewDetails = output<string>();
  readonly viewMatches = output<string>();
  readonly register = output<string>();

  protected readonly expanded = signal(false);
  protected readonly overflowing = signal(false);
  private readonly text = viewChild<ElementRef<HTMLElement>>('text');

  protected readonly hasBracket = computed(
    () =>
      !!this.tournament().forgeState?.bracket?.stages?.length &&
      !['completed', 'cancelled'].includes(this.tournament().status),
  );
  protected readonly canManage = computed(() => canManage(this.auth.session(), this.tournament()));
  protected readonly full = computed(() => isFull(this.tournament()));
  protected readonly alreadyRegistered = computed(() =>
    this.tournaments.myRegistrations().includes(this.tournament().id),
  );
  protected readonly registrationClosed = computed(() =>
    ['completed', 'cancelled'].includes(this.tournament().status),
  );

  protected readonly comingSoon = computed(
    () =>
      !this.registrationClosed() && registrationNotOpenYet(this.tournament(), this.timezone.now()),
  );
  protected readonly opensIn = computed(() =>
    timeUntil(this.tournament().registrationOpensAt, this.timezone.now()),
  );
  protected readonly opensAt = computed(() =>
    this.timezone.format(this.tournament().registrationOpensAt),
  );

  constructor() {
    afterRenderEffect(() => {
      this.tournament();
      const el = this.text()?.nativeElement;
      if (el && !this.expanded()) this.overflowing.set(el.scrollHeight > el.clientHeight + 2);
    });
  }
}
