import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tournament } from '../../core/models/models';

@Component({
  selector: 'tf-tournament-credits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    🏷️ {{ label() }}: {{ names().join(', ') }}
    @if (tournament().sponsor) {
      · 🎗️ Sponsored by {{ tournament().sponsor }}
    }
  `,
  styles: `
    :host {
      display: block;
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-soft);
    }
  `,
})
export class TournamentCredits {
  readonly tournament = input.required<Tournament>();

  protected readonly names = computed(() => {
    const t = this.tournament();
    return t.hosts.length ? t.hosts : [t.organizerName || 'TourneyForge'];
  });
  protected readonly label = computed(() => (this.names().length > 1 ? 'Hosts' : 'Host'));
}
