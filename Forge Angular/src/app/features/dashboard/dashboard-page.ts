import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { OrganizerService } from '../../core/services/organizer.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AccountActions } from '../../layout/account-actions';
import { PageHeader } from '../../layout/page-header';
import { Banner } from '../../shared/ui/banner';
import { Card } from '../../shared/ui/card';
import { TabItem, Tabs } from '../../shared/ui/tabs';
import { visibleOrganizers } from '../../core/utils/tournament';
import { UsageService } from '../../core/services/usage.service';
import { ClearDataModal } from './clear-data-modal';
import { UsagePanel } from './usage-panel';
import { MessagesModal } from '../../shared/tournament/messages-modal';
import { MatchesModal } from '../../shared/tournament/matches-modal';
import { OrganizersPanel } from './organizers-panel';
import { ParticipantsListModal } from './participants-modal';
import { TournamentForm } from './tournament-form';
import { TournamentList } from './tournament-list';

@Component({
  selector: 'tf-dashboard-page',
  imports: [
    PageHeader,
    AccountActions,
    Card,
    Banner,
    Tabs,
    TournamentForm,
    TournamentList,
    OrganizersPanel,
    ParticipantsListModal,
    MatchesModal,
    MessagesModal,
    ClearDataModal,
    UsagePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly tournamentService = inject(TournamentService);
  private readonly organizerService = inject(OrganizerService);
  protected readonly auth = inject(AuthService);

  protected readonly activeTab = signal('tournaments');
  protected readonly editing = signal<Tournament | null>(null);
  protected readonly participantsId = signal<string | null>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('tournament'),
  );

  protected readonly tournaments = resource({
    params: () => this.auth.session()?.id,
    loader: async () => {
      const session = this.auth.session();
      const all = await this.tournamentService.list();
      if (!session || session.role === 'admin') return all;
      return all.filter((t) => t.organizerId === session.id || t.managerIds.includes(session.id));
    },
  });

  protected readonly organizers = resource({
    params: () => (this.auth.session() ? true : undefined),
    loader: () => this.organizerService.list(),
  });

  protected readonly matchesId = signal<string | null>(null);
  protected readonly messagesId = signal<string | null>(null);
  protected readonly clearId = signal<string | null>(null);
  private readonly usage = inject(UsageService);
  protected readonly quotaLevel = computed(() => {
    this.usage.days();
    return this.auth.isAdmin() ? this.usage.worstLevel() : 'ok';
  });
  protected readonly assignable = computed(() =>
    visibleOrganizers(this.organizers.value() ?? [], this.auth.session()),
  );

  protected tabs(): TabItem[] {
    return [
      { id: 'tournaments', label: '🏆 Tournaments' },
      { id: 'organizers', label: '🧑‍💼 Organizers', hidden: !this.auth.canViewOrganizers() },
      { id: 'usage', label: '📊 Usage', hidden: !this.auth.isAdmin() },
    ];
  }

  constructor() {
    effect(() => {
      if (!this.auth.session()) this.auth.openLogin();
    });
  }

  protected async startEdit(id: string): Promise<void> {
    const tournament = await this.tournamentService.get(id);
    if (!tournament) return;
    this.editing.set(tournament);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected onTournamentsChanged(): void {
    this.editing.set(null);
    this.tournaments.reload();
  }

  protected onOrganizersChanged(): void {
    this.organizers.reload();
    this.tournaments.reload();
  }
}
