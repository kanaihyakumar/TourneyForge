import { booleanAttribute, ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ClipboardService } from '../../core/services/clipboard.service';
import { formatPlatoId } from '../../core/utils/plato';
import { podiumRows } from '../../core/utils/tournament';
import { ThanksNote } from '../../shared/tournament/thanks-note';
import { Button } from '../../shared/ui/button';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { PodiumBox } from '../../shared/ui/podium';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-results-panel',
  imports: [PodiumBox, Button, ThanksNote, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.winners().length) {
      <tf-podium
        variant="results"
        [title]="store.scoring() ? '🎉 Tournament Results (by points)' : '🎉 Tournament Results'"
        [winners]="store.winners()"
      >
        <button type="button" tfButton size="sm" class="copy-results" (click)="copyResults()">
          📋 Copy Results
        </button>
        <tf-thanks-note />
      </tf-podium>
    }
    @if (showClosing() && store.tournament()?.closingMessage; as closing) {
      <div class="closing">
        <p class="text">{{ closing }}</p>
        <tf-chunk-copy [chunks]="[closing]" label="Copy closing message" />
      </div>
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }

    .copy-results {
      margin-top: 10px;
    }

    .closing {
      @include neu-well(4px);
      padding: 14px 16px;
      margin-top: 14px;
    }

    .text {
      margin: 0 0 10px;
      font-weight: 600;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  `,
})
export class ResultsPanel {
  private readonly clipboard = inject(ClipboardService);
  protected readonly store = inject(ForgeStore);

  readonly showClosing = input(false, { transform: booleanAttribute });

  protected copyResults(): void {
    const lines = podiumRows(this.store.winners()).map(
      (r) =>
        `${r.medal} ${r.label}: ${formatPlatoId(r.name)}${r.detail ? ` (${r.detail})` : ''}${r.prize ? ` - 🎁 ${r.prize}` : ''}`,
    );
    this.clipboard.copy(['🎉 Tournament Results', ...lines].join('\n'), undefined, 'accent');
  }
}
