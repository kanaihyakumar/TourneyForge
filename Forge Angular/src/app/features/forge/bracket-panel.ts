import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { chunkText } from '../../core/utils/bracket';
import { Checkbox } from '../../shared/forms/checkbox';
import { Select } from '../../shared/forms/select';
import { Button } from '../../shared/ui/button';
import { ChipList } from '../../shared/ui/chip-list';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { Field } from '../../shared/ui/field';
import { BracketStageView } from './bracket-stage';
import { ForgeStore } from './forge-store';
import { NextRoundPlanner } from './next-round-planner';
import { ResultsPanel } from './results-panel';

@Component({
  selector: 'tf-bracket-panel',
  imports: [
    FormsModule,
    Checkbox,
    Select,
    Button,
    ChipList,
    ChunkCopy,
    Field,
    BracketStageView,
    NextRoundPlanner,
    ResultsPanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="intro">
      <div class="settings">
        @if (store.perMatch() === 2) {
          <tf-checkbox
            variant="toggle"
            [ngModel]="store.thirdPlaceEnabled()"
            (ngModelChange)="store.thirdPlaceEnabled.set($event)"
            [disabled]="store.started() || store.viewOnly()"
          >
            Also generate a 3rd place match (from the two semifinal losers)
          </tf-checkbox>
        }
        @if (!store.tournamentMode) {
          <tf-field label="Players per match" for="perMatch">
            <tf-select
              inputId="perMatch"
              [options]="perMatchOptions"
              [ngModel]="'' + store.perMatch()"
              (ngModelChange)="store.perMatch.set(+$event)"
              [disabled]="store.started()"
            />
          </tf-field>
        }
        @if (store.tournamentMode && store.tableSizeOptions().length) {
          <tf-field label="Players per match" for="perMatch">
            <tf-select
              inputId="perMatch"
              [options]="store.tableSizeOptions()"
              [ngModel]="'' + store.perMatch()"
              (ngModelChange)="store.setPerMatch(+$event)"
              [disabled]="store.started() || store.viewOnly()"
            />
          </tf-field>
        }
        @if (store.perMatch() > 2) {
          <tf-field
            label="Suggested players advancing from each table (you can still pick any number)"
            for="advance"
          >
            <tf-select
              inputId="advance"
              [options]="advanceOptions()"
              [ngModel]="'' + store.advancePerMatch()"
              (ngModelChange)="store.advancePerMatch.set(+$event)"
            />
          </tf-field>
        }
      </div>
      <div class="btn-row flush">
        @if (store.viewOnly()) {
          <span class="field-note">View only</span>
        } @else if (store.started()) {
          <button type="button" tfButton (click)="store.resetBracket()">🔁 Reset Bracket</button>
        } @else {
          <button type="button" tfButton variant="primary" (click)="store.startBracket()">
            🏆 Start Bracket from Participants
          </button>
        }
      </div>
    </div>

    @if (!store.started()) {
      <p class="empty-note">
        No bracket yet - add participants above, then click "Start Bracket" to generate your first
        match set.
      </p>
    }

    @for (stage of store.stages(); track $index; let i = $index) {
      <tf-bracket-stage
        [stage]="stage"
        [stageIndex]="i"
        [readOnly]="store.viewOnly()"
        [canReshuffle]="i === store.stages().length - 1 && !store.podium() && !store.viewOnly()"
        (reshuffle)="store.reshuffleLastStage()"
        (pick)="pick(i, $event)"
      />
    }

    @if (!store.podium() && store.lastStage() && !store.viewOnly()) {
      @if (store.lastStageComplete() && store.tableSizeOptions().length) {
        <div class="next-round">
          <tf-field label="Players per game next round" for="nextTable">
            <tf-select
              inputId="nextTable"
              [options]="store.tableSizeOptions()"
              [ngModel]="'' + store.perMatch()"
              (ngModelChange)="store.setPerMatch(+$event)"
            />
          </tf-field>
        </div>
      }
      @if (store.nextRound(); as info) {
        <div class="next-round">
          <p class="field-note">
            🎯 {{ info.count }} players advance - next round has {{ info.sizes.length }}
            {{ info.sizes.length === 1 ? 'table' : 'tables' }} ({{ info.sizes.join(' + ') }}
            players).
          </p>
          @if (info.fullTotals.length) {
            <p class="field-note">
              💡 For full games of {{ store.perMatch() }} players,
              {{ info.fullTotals.join(' or ') }}
              players should advance. Change the picks above if you need to.
            </p>
          }
        </div>
      }
      @if (store.advanceLabel(); as label) {
        <div class="btn-row">
          <button type="button" tfButton variant="primary" (click)="store.advance()">
            ▶ Generate Next Match Set ({{ label }})
          </button>
        </div>
      } @else if (!store.lastStageComplete()) {
        <p class="field-note">
          👆 Pick a winner for every match above to unlock the next match set.
        </p>
      } @else if (store.freeRounds()) {
        <tf-next-round-planner />
      }
    }

    @if (store.freeRounds() && store.roundWinnerLines().length) {
      <div class="round-winners">
        <h3>🏆 Round winners</h3>
        <tf-chip-list [items]="store.roundWinnerLines()" />
        <div class="btn-row">
          <tf-chunk-copy [chunks]="roundWinnerChunks()" label="Copy round winners" tone="accent" />
        </div>
      </div>
    }

    <tf-results-panel />
  `,
  styles: `
    :host {
      display: block;
    }

    .intro {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 18px;
    }

    .settings {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 260px;
    }

    .next-round {
      margin-top: 14px;
      max-width: 360px;
    }

    .round-winners {
      margin-top: 18px;
    }

    .round-winners h3 {
      margin: 0 0 10px;
      font-size: 1rem;
      font-weight: 900;
    }
  `,
})
export class BracketPanel {
  protected readonly store = inject(ForgeStore);

  protected readonly roundWinnerChunks = computed(() =>
    chunkText(this.store.roundWinnerLines(), '\n', '🏆 Round winners'),
  );
  protected readonly advanceOptions = computed(() =>
    Array.from({ length: Math.max(1, this.store.perMatch() - 1) }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1} ${i === 0 ? 'player' : 'players'}`,
    })),
  );
  protected readonly perMatchOptions = Array.from({ length: 8 }, (_, i) => ({
    value: String(i + 2),
    label: i === 0 ? '2 (1v1)' : `${i + 2} players`,
  }));

  protected pick(stageIndex: number, event: { matchIndex: number; playerIndex: number }): void {
    this.store.pickWinner(stageIndex, event.matchIndex, event.playerIndex);
  }
}
