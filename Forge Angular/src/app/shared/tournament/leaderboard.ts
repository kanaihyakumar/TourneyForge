import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LeaderboardRow } from '../../core/models/models';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';

@Component({
  selector: 'tf-leaderboard',
  imports: [PlatoIdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of rows(); track row.name; let i = $index) {
      <div class="row">
        <span class="rank">{{ i + 1 }}</span>
        <span class="name">{{ row.name | platoId }}</span>
        @if (row.pro || row.nab) {
          <span class="stat">
            @if (row.pro) {
              Pro ×{{ row.pro }}
            }
            @if (row.nab) {
              Nab ×{{ row.nab }}
            }
          </span>
        }
        <span class="stat">{{ row.wins }}/{{ row.games }} wins</span>
        <span class="points">{{ row.points }} pts</span>
      </div>
    } @empty {
      <p class="empty-note">No players yet.</p>
    }
  `,
  styles: `
    @use 'mixins' as *;

    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      margin-bottom: 10px;
      @include neu-surface(4px, var(--radius-sm));
      font-weight: 800;
      font-size: 0.9rem;
    }

    .rank {
      width: 24px;
      color: var(--text-soft);
    }

    .name {
      flex: 1;
    }

    .cat,
    .stat {
      font-size: 0.74rem;
      color: var(--text-soft);
    }

    .points {
      color: var(--accent-dark);
    }
  `,
})
export class Leaderboard {
  readonly rows = input.required<LeaderboardRow[]>();
}
