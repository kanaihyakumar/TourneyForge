import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { computeLeaderboard, scoringGames, standingDetail } from '../../core/utils/scoring';
import { registrationLabel, usesFreeRounds } from '../../core/utils/tournament';
import { ChipList } from '../ui/chip-list';
import { Leaderboard } from './leaderboard';
import { FormsModule } from '@angular/forms';
import { Input } from '../forms/input';
import { Field } from '../ui/field';
import { Button } from '../ui/button';
import { TournamentService } from '../../core/services/tournament.service';
import {
  currentStages,
  deserializeStages,
  matchInvolves,
  podiumFromStages,
  roundWinnerLines,
} from '../../core/utils/bracket';
import { BracketStageView } from '../../features/forge/bracket-stage';
import { Modal } from '../ui/modal';
import { PodiumBox } from '../ui/podium';
import { winnersFromPodium } from '../../core/utils/tournament';

@Component({
  selector: 'tf-matches-modal',
  imports: [
    ChipList,
    Leaderboard,
    FormsModule,
    Modal,
    BracketStageView,
    PodiumBox,
    Field,
    Input,
    Button,
  ],
  styles: `
    .tools {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .category {
      margin: 18px 0 10px;
      font-size: 0.95rem;
      font-weight: 900;
    }

    .tools tf-field {
      flex: 1 1 220px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="'Current matches - ' + (tournament.value()?.title ?? '')"
      [maxWidth]="720"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      @if (stages().length) {
        <div class="tools">
          <tf-field label="Find your match" hint="(type your Plato ID)" for="matchSearch">
            <tf-input
              inputId="matchSearch"
              placeholder="e.g. ShadowFang"
              autocomplete="off"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
            />
          </tf-field>
          <button type="button" tfButton size="sm" (click)="tournament.reload()">🔄 Refresh</button>
        </div>
      }
      @for (stage of stages(); track $index) {
        <tf-bracket-stage [stage]="stage" [filter]="query()" readOnly />
      } @empty {
        <p class="empty-note">The bracket hasn't started yet.</p>
      }
      @if (stages().length && query() && !anyMatch()) {
        <p class="empty-note">No current match found for “{{ query() }}”.</p>
      }
      @if (leaderboard().length) {
        <h3 class="category">⭐ Leaderboard</h3>
        <tf-leaderboard [rows]="leaderboard()" />
      }
      @if (roundWinners().length) {
        <h3 class="category">🏆 Round winners</h3>
        <tf-chip-list [items]="roundWinners()" />
      }
      @if (winners().length) {
        <tf-podium variant="results" title="🎉 Tournament Results" [winners]="winners()" />
      }
    </tf-modal>
  `,
})
export class MatchesModal {
  private readonly tournaments = inject(TournamentService);

  readonly tournamentId = model<string | null>(null);

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });

  protected readonly allStages = computed(() => {
    const saved = this.tournament.value()?.forgeState?.bracket?.stages;
    return saved ? deserializeStages(saved) : [];
  });
  protected readonly stages = computed(() => currentStages(this.allStages()));
  protected readonly winners = computed(() => {
    const t = this.tournament.value();
    const ranked = this.leaderboard().filter((r) => r.games > 0);
    if (t?.scoring?.enabled && ranked.length) {
      const places = Math.min(4, t.winners.length || 3);
      return ranked
        .slice(0, places)
        .map((r, i) => ({ place: i + 1, name: r.name, detail: standingDetail(r) }));
    }
    if (this.isFreeRounds()) return [];
    const podium = podiumFromStages(this.allStages());
    return podium ? winnersFromPodium(podium) : [];
  });
  protected readonly isFreeRounds = computed(() => {
    const t = this.tournament.value();
    return !!t && usesFreeRounds(t);
  });
  protected readonly roundWinners = computed(() =>
    this.isFreeRounds() ? roundWinnerLines(this.allStages()) : [],
  );
  protected readonly leaderboard = computed(() => {
    const t = this.tournament.value();
    if (!t?.scoring?.enabled) return [];
    const members = t.registrations.map((r) => registrationLabel(r, t.teamSize));
    return computeLeaderboard(
      members,
      scoringGames(t.forgeState?.games ?? [], this.allStages()),
      t.scoring,
    );
  });
  protected readonly query = signal('');
  protected readonly anyMatch = computed(() =>
    this.stages().some((s) => s.matches.some((m) => matchInvolves(m, this.query()))),
  );
  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());

  constructor() {
    effect(() => {
      if (this.tournamentId()) untracked(() => this.query.set(''));
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }
}
