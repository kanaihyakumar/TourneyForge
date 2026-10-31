import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ParticipantTarget } from '../../core/models/models';
import { ParticipantModal } from '../../shared/tournament/participant-modal';
import { AddRow } from '../../shared/ui/add-row';
import { Button } from '../../shared/ui/button';
import { ChipList } from '../../shared/ui/chip-list';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-participants-panel',
  imports: [AddRow, ChipList, Button, ChunkCopy, ParticipantModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!store.tournamentMode) {
      <tf-add-row
        placeholder="e.g. Speedy"
        ariaLabel="Participant name"
        buttonLabel="+ Add Participant"
        primary
        (added)="store.addMember($event)"
      />
    }
    <div class="member-count" aria-live="polite">
      <span class="dot" aria-hidden="true"></span>{{ countText() }}
    </div>
    <tf-chip-list
      [items]="store.memberLabels()"
      [removable]="!store.tournamentMode"
      [replaceable]="store.canReplace()"
      emptyText="No participants yet."
      (removed)="store.removeMember($event)"
      (replace)="startReplace($event)"
    />
    @if (store.tournamentMode || store.memberLabels().length) {
      <div class="btn-row">
        @if (store.tournamentMode && store.canReplace()) {
          <button type="button" tfButton size="sm" variant="primary" (click)="startAdd()">
            ➕ Add participant
          </button>
          @if (showMessages()) {
            <button type="button" tfButton size="sm" (click)="messages.emit()">
              💬 Suggested messages
            </button>
          }
        }
        <tf-chunk-copy [chunks]="store.memberChunks()" label="Copy participants" tone="accent" />
      </div>
    }
    <tf-participant-modal [(target)]="replacing" (saved)="store.refresh()" />
  `,
  styles: `
    .member-count {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--text-soft);
      margin: 16px 0 10px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
  `,
})
export class ParticipantsPanel {
  protected readonly store = inject(ForgeStore);

  readonly showMessages = input(true);
  readonly messages = output<void>();

  protected readonly replacing = signal<ParticipantTarget | null>(null);
  protected readonly countText = computed(() => {
    const count = this.store.members().length;
    return `${count} ${count === 1 ? 'participant' : 'participants'} added`;
  });

  protected startAdd(): void {
    const tournament = this.store.tournament();
    if (tournament) this.replacing.set({ tournament, index: null });
  }

  protected startReplace(index: number): void {
    const tournament = this.store.tournament();
    if (tournament) this.replacing.set({ tournament, index });
  }
}
