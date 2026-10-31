import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { TournamentService } from '../../core/services/tournament.service';
import { canManage, manageableTournaments, sortTournaments } from '../../core/utils/tournament';
import { AccountActions } from '../../layout/account-actions';
import { ContactLine } from '../../layout/contact-line';
import { PageHeader } from '../../layout/page-header';
import { Banner } from '../../shared/ui/banner';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ListRow } from '../../shared/ui/list-row';
import { StatusBadge } from '../../shared/ui/status-badge';
import { HostConsole } from './host-console';

@Component({
  selector: 'tf-host-page',
  imports: [
    RouterLink,
    PageHeader,
    AccountActions,
    ContactLine,
    Banner,
    Button,
    Card,
    ListRow,
    StatusBadge,
    HostConsole,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-page-header logo="📱" subtitle="Host Mode - everything you need to run the tournament.">
      <tf-account-actions />
    </tf-page-header>

    @if (!auth.session()) {
      <tf-banner icon="🔐" tone="warn" spread>
        Host Mode is for organizers and admins - please log in.
        <button
          bannerAside
          type="button"
          tfButton
          variant="primary"
          size="sm"
          (click)="auth.openLogin()"
        >
          🔐 Login
        </button>
      </tf-banner>
    } @else if (!id()) {
      <tf-card
        icon="📱"
        title="Pick a tournament"
        hint="Open Host Mode next to the Plato app (split-screen) or switch between them quickly - copy a message here, paste it in the group."
      >
        @if (!list.hasValue()) {
          <p class="empty-note">Loading tournaments…</p>
        } @else {
          @for (t of choices(); track t.id) {
            <tf-list-row>
              <ng-container ngProjectAs="[rowTitle]">
                <tf-status-badge [status]="t.status" short /> {{ t.title }}
              </ng-container>
              <ng-container ngProjectAs="[rowSub]">
                {{ t.game }} · {{ t.registeredCount
                }}{{ t.teamCapacity ? '/' + t.teamCapacity : '' }}
                registered
              </ng-container>
              <ng-container ngProjectAs="[rowActions]">
                <a
                  tfButton
                  variant="primary"
                  size="sm"
                  routerLink="/host"
                  [queryParams]="{ id: t.id }"
                >
                  📱 Open
                </a>
              </ng-container>
            </tf-list-row>
          } @empty {
            <p class="empty-note">No tournaments to host yet. Create one from the dashboard.</p>
          }
        }
      </tf-card>
    } @else if (selected.isLoading()) {
      <p class="empty-note">Loading tournament…</p>
    } @else if (selected.value(); as t) {
      <tf-host-console [tournament]="t" />
    } @else {
      <tf-banner icon="🚫" tone="warn" spread>
        This tournament was not found, or you don't manage it.
        <a bannerAside tfButton size="sm" routerLink="/host">🔀 Pick another</a>
      </tf-banner>
    }

    <tf-contact-line />
  `,
})
export class HostPage {
  protected readonly auth = inject(AuthService);
  private readonly tournaments = inject(TournamentService);
  private readonly forgeImport = inject(ForgeImportService);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('id'))),
    { initialValue: this.route.snapshot.queryParamMap.get('id') },
  );

  protected readonly list = resource({
    params: () => (this.auth.session() && !this.id() ? this.auth.session()!.id : undefined),
    loader: async () => manageableTournaments(await this.tournaments.list(), this.auth.session()),
  });

  protected readonly choices = computed(() => sortTournaments(this.list.value() ?? []));

  protected readonly selected = resource({
    params: () => (this.auth.session() ? (this.id() ?? undefined) : undefined),
    loader: async ({ params }) => {
      const tournament = await this.tournaments.get(params);
      if (!tournament || !canManage(this.auth.session(), tournament)) return null;
      this.forgeImport.select(tournament);
      return tournament;
    },
  });
}
