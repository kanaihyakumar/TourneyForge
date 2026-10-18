import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParticipantTarget } from '../../core/models/models';
import { ClipboardService } from '../../core/services/clipboard.service';
import { chunkText } from '../../core/utils/bracket';
import { formatPlatoId } from '../../core/utils/plato';
import { podiumRows } from '../../core/utils/tournament';
import { ContactLine } from '../../layout/contact-line';
import { CreditLine } from '../../layout/credit-line';
import { PageHeader } from '../../layout/page-header';
import { Checkbox } from '../../shared/forms/checkbox';
import { Select } from '../../shared/forms/select';
import { Field } from '../../shared/ui/field';
import { MessagesModal } from '../../shared/tournament/messages-modal';
import { ParticipantModal } from '../../shared/tournament/participant-modal';
import { AddRow } from '../../shared/ui/add-row';
import { Banner } from '../../shared/ui/banner';
import { Button } from '../../shared/ui/button';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { Card } from '../../shared/ui/card';
import { ChipList } from '../../shared/ui/chip-list';
import { PodiumBox } from '../../shared/ui/podium';
import { NextRoundPlanner } from './next-round-planner';
import { ScoringPanel } from './scoring-panel';
import { BracketStageView } from './bracket-stage';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-forge-page',
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    CreditLine,
    ContactLine,
    Card,
    Banner,
    Button,
    AddRow,
    ChipList,
    Checkbox,
    Select,
    Field,
    PodiumBox,
    ChunkCopy,
    BracketStageView,
    ScoringPanel,
    NextRoundPlanner,
    ParticipantModal,
    MessagesModal,
  ],
  providers: [ForgeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forge-page.html',
  styleUrl: './forge-page.scss',
})
export class ForgePage {
  private readonly clipboard = inject(ClipboardService);
  protected readonly store = inject(ForgeStore);

  protected readonly memberLabels = computed(() => this.store.members().map(formatPlatoId));
  protected readonly roundWinnerChunks = computed(() =>
    chunkText(this.store.roundWinnerLines(), '\n', '🏆 Round winners'),
  );
  protected readonly memberChunks = computed(() => chunkText(this.memberLabels(), ', '));
  protected readonly memberCountText = computed(() => {
    const count = this.store.members().length;
    return `${count} ${count === 1 ? 'participant' : 'participants'} added`;
  });
  protected readonly importText = computed(() => {
    const imported = this.store.imported;
    return imported
      ? `Building the bracket for "${imported.title}" - ${this.store.members().length} participant(s) loaded below.`
      : '';
  });
  protected readonly messagesId = signal<string | null>(null);
  protected readonly perMatchOptions = Array.from({ length: 8 }, (_, i) => ({
    value: String(i + 2),
    label: i === 0 ? '2 (1v1)' : `${i + 2} players`,
  }));
  protected readonly advanceOptions = computed(() =>
    Array.from({ length: Math.max(1, this.store.perMatch() - 1) }, (_, i) => ({
      value: String(i + 1),
      label: `${i + 1} ${i === 0 ? 'player' : 'players'}`,
    })),
  );
  protected readonly tableSizeOptions = computed(() =>
    this.store.tableSizeOptions().map((n) => ({ value: String(n), label: `${n} players` })),
  );
  protected readonly replacing = signal<ParticipantTarget | null>(null);
  protected readonly syncFailed = computed(() => this.store.syncStatus().startsWith('⚠️'));

  constructor() {
    this.store.init();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.store.hasPendingSaves) return;
    event.preventDefault();
    event.returnValue = '';
  }

  protected startAdd(): void {
    const tournament = this.store.tournament();
    if (tournament) this.replacing.set({ tournament, index: null });
  }

  protected startReplace(index: number): void {
    const tournament = this.store.tournament();
    if (tournament) this.replacing.set({ tournament, index });
  }

  protected pick(stageIndex: number, event: { matchIndex: number; playerIndex: number }): void {
    this.store.pickWinner(stageIndex, event.matchIndex, event.playerIndex);
  }

  protected copyResults(): void {
    const lines = podiumRows(this.store.winners()).map(
      (r) => `${r.medal} ${r.label}: ${formatPlatoId(r.name)}${r.detail ? ` (${r.detail})` : ''}`,
    );
    this.clipboard.copy(['🎉 Tournament Results', ...lines].join('\n'), undefined, 'accent');
  }
}
