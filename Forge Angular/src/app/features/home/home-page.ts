import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  resource,
  signal,
} from '@angular/core';
import { STATUS_REFRESH_MS } from '../../core/config/constants';
import { TimezoneService } from '../../core/services/timezone.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AccountActions } from '../../layout/account-actions';
import { CreditLine } from '../../layout/credit-line';
import { TimezonePicker } from '../../layout/timezone-picker';
import { ContactLine } from '../../layout/contact-line';
import { PageHeader } from '../../layout/page-header';
import { PillButton } from '../../shared/ui/pill-button';
import { MatchesModal } from '../../shared/tournament/matches-modal';
import { InstallApp } from '../../layout/install-app';
import { HowTo } from '../help/how-to';
import { HowItWorks } from './how-it-works';
import { TourCard } from './tour-card';
import { WinnersMarquee } from './winners-marquee';
import { TournamentDetailModal } from './tournament-detail-modal';

@Component({
  selector: 'tf-home-page',
  imports: [
    PageHeader,
    TimezonePicker,
    AccountActions,
    CreditLine,
    ContactLine,
    PillButton,
    TourCard,
    WinnersMarquee,
    HowItWorks,
    HowTo,
    InstallApp,
    MatchesModal,
    TournamentDetailModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly tournamentService = inject(TournamentService);
  protected readonly timezone = inject(TimezoneService);

  protected readonly tournaments = resource({ loader: () => this.tournamentService.list() });
  protected readonly detailId = signal<string | null>(null);
  protected readonly focusRegister = signal(false);
  protected readonly matchesId = signal<string | null>(null);
  protected readonly showCompleted = signal(true);

  protected readonly liveUpcoming = computed(() =>
    (this.tournaments.value() ?? []).filter(
      (t) => t.status === 'ongoing' || t.status === 'upcoming',
    ),
  );
  protected readonly completed = computed(() =>
    (this.tournaments.value() ?? [])
      .filter((t) => t.status === 'completed' || t.status === 'cancelled')
      .sort((a, b) => b.startUTC - a.startUTC),
  );
  protected readonly toggleLabel = computed(
    () =>
      `${this.showCompleted() ? '🔼 Hide' : '📜 Show'} completed tournaments (${this.completed().length})`,
  );

  constructor() {
    const timer = setInterval(() => this.tournaments.reload(), STATUS_REFRESH_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected openDetail(id: string, focusRegister: boolean): void {
    this.focusRegister.set(focusRegister);
    this.detailId.set(id);
  }

  protected onRegistered(): void {
    this.detailId.set(null);
    this.tournaments.reload();
  }
}
