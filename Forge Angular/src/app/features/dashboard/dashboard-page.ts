import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { InboxService } from '../../core/services/inbox.service';
import { LiveChatService } from '../../core/services/live-chat.service';
import { OrganizerService } from '../../core/services/organizer.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AccountActions } from '../../layout/account-actions';
import { NewGamesBanner } from '../../layout/new-games-banner';
import { PageHeader } from '../../layout/page-header';
import { Banner } from '../../shared/ui/banner';
import { Card } from '../../shared/ui/card';
import { TabItem, Tabs } from '../../shared/ui/tabs';
import { manageableTournaments, visibleOrganizers } from '../../core/utils/tournament';
import { UsageService } from '../../core/services/usage.service';
import { ThanksNote } from '../../shared/tournament/thanks-note';
import { AssignModal } from './assign-modal';
import { RegistrationKeyModal } from './registration-key-modal';
import { ClearDataModal } from './clear-data-modal';
import { NotificationsPanel } from './notifications-panel';
import { SupportMessages } from './support-messages';
import { UsagePanel } from './usage-panel';
import { MessagesModal } from '../../shared/tournament/messages-modal';
import { MatchesModal } from '../../shared/tournament/matches-modal';
import { OrganizersPanel } from './organizers-panel';
import { ParticipantsListModal } from './participants-modal';
import { TournamentForm } from './tournament-form';
import { TournamentList } from './tournament-list';

const REFRESH_GAP_MS = 15000;

@Component({
  selector: 'tf-dashboard-page',
  imports: [
    PageHeader,
    AccountActions,
    Card,
    Banner,
    NewGamesBanner,
    Tabs,
    TournamentForm,
    TournamentList,
    OrganizersPanel,
    ParticipantsListModal,
    MatchesModal,
    MessagesModal,
    ClearDataModal,
    AssignModal,
    ThanksNote,
    RegistrationKeyModal,
    UsagePanel,
    NotificationsPanel,
    SupportMessages,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly tournamentService = inject(TournamentService);
  private readonly organizerService = inject(OrganizerService);
  private readonly live = inject(LiveChatService);
  private readonly inbox = inject(InboxService);
  protected readonly auth = inject(AuthService);

  protected readonly activeTab = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('tab') ?? 'tournaments',
  );
  protected readonly editing = signal<Tournament | null>(null);
  protected readonly participantsId = signal<string | null>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('tournament'),
  );

  protected readonly tournaments = resource({
    params: () => this.auth.session()?.id,
    loader: async () => {
      const session = this.auth.session();
      const all = await this.tournamentService.list();
      return session ? manageableTournaments(all, session) : all;
    },
  });

  protected readonly organizers = resource({
    params: () => (this.auth.session() ? true : undefined),
    loader: () => this.organizerService.list(),
  });

  protected readonly matchesId = signal<string | null>(null);
  protected readonly messagesId = signal<string | null>(null);
  protected readonly clearId = signal<string | null>(null);
  protected readonly assigning = signal<Tournament | null>(null);
  protected readonly keyFor = signal<Tournament | null>(null);
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
      { id: 'tournaments', label: '📋 My Tournaments' },
      { id: 'create', label: this.editing() ? '✏️ Editing' : '➕ Create' },
      { id: 'organizers', label: '🧑‍💼 Organizers', hidden: !this.auth.canViewOrganizers() },
      { id: 'usage', label: '📊 Usage', hidden: !this.auth.isAdmin() },
      {
        id: 'notifications',
        label: '🔔 Notifications',
        hidden: !this.auth.isAdmin(),
        badge: this.live.attention() + this.inbox.unread(),
      },
      {
        id: 'messages',
        label: '💬 Messages',
        hidden: this.auth.isAdmin(),
        badge: this.inbox.unread(),
      },
    ];
  }

  constructor() {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < REFRESH_GAP_MS) {
        return;
      }
      lastRefresh = Date.now();
      if (this.auth.session() && !this.editing()) this.tournaments.reload();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    });
    effect(() => {
      if (!this.auth.session()) this.auth.openLogin();
    });
    effect(() => {
      const available = this.tabs().some((tab) => tab.id === this.activeTab() && !tab.hidden);
      if (!available) this.activeTab.set('tournaments');
    });
    effect(() => {
      void this.auth.session()?.id;
      untracked(() => this.editing.set(null));
    });
  }

  protected async startEdit(id: string): Promise<void> {
    const tournament = await this.tournamentService.get(id);
    if (!tournament) return;
    this.editing.set(tournament);
    this.activeTab.set('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.activeTab.set('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.activeTab.set('tournaments');
  }

  protected onTournamentsChanged(): void {
    this.editing.set(null);
    this.activeTab.set('tournaments');
    this.tournaments.reload();
  }

  protected onOrganizersChanged(): void {
    this.organizers.reload();
    this.tournaments.reload();
  }
}
