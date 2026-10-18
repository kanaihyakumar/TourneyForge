import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WerewolfSide } from '../../core/models/models';
import { resultOf } from '../../core/utils/scoring';
import { Button } from '../../shared/ui/button';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-game-recorder',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">
      Tap each player's role and result, or tap the 🐺 werewolves and then who won.
    </p>
    <div class="btn-row">
      <button type="button" tfButton size="sm" (click)="apply('villagers')">
        🏘️ Villagers won
      </button>
      <button type="button" tfButton size="sm" variant="primary" (click)="apply('werewolves')">
        🐺 Werewolves won
      </button>
    </div>
    @if (recorded() > 0) {
      <p class="status">✅ {{ recorded() }}/{{ players().length }} players recorded</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: 10px;
    }

    .hint,
    .status {
      margin: 0 0 6px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-soft);
    }

    .btn-row {
      margin-top: 6px;
      gap: 8px;
    }

    .status {
      margin-top: 8px;
      color: var(--success);
    }
  `,
})
export class GameRecorder {
  private readonly store = inject(ForgeStore);

  readonly gameRef = input.required<string>();
  readonly label = input.required<string>();
  readonly players = input.required<string[]>();

  protected readonly recorded = computed(() => {
    const game = this.store.gameFor(this.gameRef());
    return game ? this.players().filter((p) => resultOf(game, p) !== null).length : 0;
  });

  protected apply(winner: WerewolfSide): void {
    this.store.applyWinningSide(this.gameRef(), this.label(), this.players(), winner);
  }
}
