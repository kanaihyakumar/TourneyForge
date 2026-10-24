import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  resource,
  signal,
} from '@angular/core';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { chunkText } from '../../core/utils/bracket';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { TournamentService } from '../../core/services/tournament.service';
import { formatPlatoId } from '../../core/utils/plato';
import { registrationLabel } from '../../core/utils/tournament';
import { ParticipantTarget } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { canManage, isViewOnlyFor } from '../../core/utils/tournament';
import { ParticipantModal } from '../../shared/tournament/participant-modal';
import { Button } from '../../shared/ui/button';
import { ChipList } from '../../shared/ui/chip-list';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-participants-modal',
  imports: [Modal, ChipList, Button, ParticipantModal, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="'Participants - ' + (tournament.value()?.title ?? '')"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      @if (tournament.value(); as t) {
        @if (labels().length === 0) {
          <p class="empty-note">No participants yet.</p>
        } @else {
          @if (t.teamSize === 2) {
            <p class="field-note team-note">👥 2v2 tournament - each entry below is one team.</p>
          }
          <tf-chip-list
            [items]="labels()"
            [replaceable]="canReplace()"
            (replace)="replacing.set({ tournament: t, index: $event })"
          />
        }
        <div class="btn-row">
          @if (canReplace()) {
            <button
              type="button"
              tfButton
              size="sm"
              (click)="replacing.set({ tournament: t, index: null })"
            >
              ➕ Add participant
            </button>
          }
          @if (labels().length) {
            <tf-chunk-copy [chunks]="chunks()" label="Copy all IDs" />
            <button type="button" tfButton variant="primary" size="sm" (click)="forge.launch(t.id)">
              🎲 Open in Forge
            </button>
          }
        </div>
      }
    </tf-modal>
    <tf-participant-modal [(target)]="replacing" (saved)="tournament.reload()" />
  `,
  styles: `
    .team-note {
      margin-bottom: 10px;
    }
  `,
})
export class ParticipantsListModal {
  private readonly tournaments = inject(TournamentService);
  protected readonly forge = inject(ForgeImportService);

  private readonly auth = inject(AuthService);

  readonly tournamentId = model<string | null>(null);
  protected readonly replacing = signal<ParticipantTarget | null>(null);

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });

  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());
  protected readonly labels = computed(() => {
    const t = this.tournament.value();
    return t ? t.registrations.map((r) => formatPlatoId(registrationLabel(r, t.teamSize))) : [];
  });

  protected readonly canReplace = computed(
    () =>
      canManage(this.auth.session(), this.tournament.value() ?? null) &&
      !isViewOnlyFor(this.auth.session(), this.tournament.value()),
  );

  protected readonly chunks = computed(() => chunkText(this.labels(), ', '));

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }
}
