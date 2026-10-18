import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { BracketMatch, BracketStage } from '../../core/models/models';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';
import { ClipboardService } from '../../core/services/clipboard.service';
import {
  isFinalStage,
  isMatchComplete,
  matchInvolves,
  matchLine,
  stageChunks,
  winnerLimits,
} from '../../core/utils/bracket';
import { ForgeStore } from './forge-store';
import { GameRecorder } from './game-recorder';
import { PlayerResult } from './player-result';
import { Button } from '../../shared/ui/button';
import { ChunkCopy } from '../../shared/ui/chunk-copy';

@Component({
  selector: 'tf-bracket-stage',
  imports: [PlatoIdPipe, Button, ChunkCopy, GameRecorder, PlayerResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bracket-stage.html',
  styleUrl: './bracket-stage.scss',
})
export class BracketStageView {
  readonly stage = input.required<BracketStage>();
  readonly canReshuffle = input(false);
  readonly filter = input('');
  readonly stageIndex = input(0);
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly reshuffle = output<void>();
  readonly pick = output<{ matchIndex: number; playerIndex: number }>();

  private readonly clipboard = inject(ClipboardService);
  private readonly store = inject(ForgeStore, { optional: true });
  protected readonly scoring = computed(() => !!this.store?.scoring());

  protected gameRef(index: number): string {
    return `${this.stageIndex()}:${index}`;
  }

  protected gameLabel(index: number): string {
    return `${this.stage().label} - Match ${index + 1}`;
  }

  protected readonly hasVisible = computed(() =>
    this.stage().matches.some((m) => matchInvolves(m, this.filter())),
  );
  protected shown(match: BracketMatch): boolean {
    return matchInvolves(match, this.filter());
  }

  protected readonly chunks = computed(() => stageChunks(this.stage()));

  protected copyMatch(index: number): void {
    const match = this.stage().matches[index];
    void this.clipboard.copy(matchLine(match, index), `Copied Match ${index + 1}!`, 'accent');
  }

  protected isFinalTable(match: BracketMatch): boolean {
    return match.players.length > 2 && isFinalStage(this.stage());
  }

  protected placeLabel(match: BracketMatch, playerIndex: number): string {
    const place = match.winners.indexOf(playerIndex);
    return place < 0 ? '' : ['🥇 1st', '🥈 2nd', '🥉 3rd', '4️⃣ 4th'][place];
  }

  protected flexible(match: BracketMatch): boolean {
    return winnerLimits(match, this.stage()).max > 1;
  }

  protected complete(match: BracketMatch): boolean {
    return isMatchComplete(match, this.stage());
  }

  protected readonly heading = computed(
    () => (this.stage().isThirdPlace ? '🥉 ' : '🏆 ') + this.stage().label,
  );
}
