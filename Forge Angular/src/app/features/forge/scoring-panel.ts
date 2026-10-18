import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { TournamentService } from '../../core/services/tournament.service';
import { formatPlatoId } from '../../core/utils/plato';
import { Select } from '../../shared/forms/select';
import { Leaderboard } from '../../shared/tournament/leaderboard';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { Field } from '../../shared/ui/field';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-scoring-panel',
  imports: [FormsModule, Card, Field, Select, Button, Leaderboard, PlatoIdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scoring-panel.html',
  styleUrl: './scoring-panel.scss',
})
export class ScoringPanel {
  protected readonly store = inject(ForgeStore);
  private readonly toast = inject(ToastService);

  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  protected readonly placeOptions = [
    { value: '3', label: 'Top 3 (1st - 3rd)' },
    { value: '4', label: 'Top 4 (1st - 4th)' },
  ];
  protected readonly standings = this.store.pointsStandings;

  protected async publishWinners(): Promise<void> {
    const t = this.store.tournament();
    const rows = this.standings();
    if (!t || !rows.length) {
      this.toast.show('Record at least one game first.', 'accent');
      return;
    }
    const winners = rows.map((r, i) => ({ place: i + 1, name: formatPlatoId(r.name) }));
    try {
      const result = await this.tournaments.update(t.id, { winners }, this.auth.session());
      this.toast.show(
        result ? 'Winners saved to the tournament!' : 'Could not save - check permissions.',
        'accent',
      );
    } catch (err) {
      this.toast.show('Something went wrong saving the winners.', 'accent');
      console.error(err);
    }
  }

  protected readonly config = computed(() => this.store.scoring());
  protected readonly summary = computed(() => {
    const c = this.config();
    return c
      ? `Villagers: win +${c.villagersWin} / lose ${c.villagersLose} · Werewolves: win +${c.werewolvesWin} / lose ${c.werewolvesLose} · Pro +${c.proPoints} · Nab -${c.nabPoints}`
      : '';
  });
}
