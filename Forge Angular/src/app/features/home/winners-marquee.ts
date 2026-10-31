import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tournament } from '../../core/models/models';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';
import { podiumRows } from '../../core/utils/tournament';

const SECONDS_PER_ITEM = 13;
const MAX_ITEMS = 12;

@Component({
  selector: 'tf-winners-marquee',
  imports: [PlatoIdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length) {
      <div class="marquee" role="region" aria-label="Recent tournament winners">
        <span class="badge">🏆 HALL OF FAME</span>
        <div class="viewport">
          <div class="track" [style.animation-duration.s]="duration()">
            @for (copy of copies; track copy) {
              <div class="group" [attr.aria-hidden]="copy ? true : null">
                @for (item of items(); track item.id) {
                  <span class="item">
                    <span class="title">{{ item.title }}</span>
                    <span class="game">{{ item.game }}</span>
                    @for (row of item.rows; track $index) {
                      <span class="winner"
                        >{{ row.medal }} <strong>{{ row.name | platoId }}</strong>
                        @if (row.prize) {
                          <span class="prize">🎁 {{ row.prize }}</span>
                        }
                      </span>
                    }
                    <span class="spark">✨</span>
                  </span>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      margin-bottom: 26px;
    }

    .marquee {
      @include neu-well(5px, var(--radius-pill));
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 10px;
      overflow: hidden;
    }

    .badge {
      @include neu-surface(4px, var(--radius-pill));
      flex: none;
      padding: 7px 14px;
      font-size: 0.78rem;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: var(--accent-dark);
      animation: glow 2.4s ease-in-out infinite;
    }

    .viewport {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent);
    }

    .track {
      display: flex;
      width: max-content;
      animation: scroll linear infinite;
    }

    .marquee:hover .track,
    .marquee:focus-within .track {
      animation-play-state: paused;
    }

    .group {
      display: flex;
      flex: none;
    }

    .item {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 0 22px;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-soft);
      white-space: nowrap;
    }

    .title {
      color: var(--text);
      font-weight: 900;
    }

    .game {
      font-size: 0.74rem;
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      color: var(--accent-dark);
      @include neu-well(2px, var(--radius-pill));
    }

    .winner strong {
      color: var(--accent-dark);
      font-weight: 900;
    }

    .prize {
      color: var(--success);
      font-weight: 800;
      margin-left: 4px;
    }

    .spark {
      animation: twinkle 1.6s ease-in-out infinite;
    }

    @keyframes scroll {
      to {
        transform: translateX(-50%);
      }
    }

    @keyframes glow {
      50% {
        color: var(--accent);
        text-shadow: 0 0 10px var(--accent-glow);
      }
    }

    @keyframes twinkle {
      50% {
        opacity: 0.3;
        transform: scale(0.7) rotate(20deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .track,
      .badge,
      .spark {
        animation: none;
      }

      .viewport {
        overflow-x: auto;
      }

      .group[aria-hidden] {
        display: none;
      }
    }

    @media (max-width: 560px) {
      .marquee {
        flex-direction: column;
        align-items: stretch;
        border-radius: var(--radius-lg);
      }

      .badge {
        align-self: center;
      }
    }
  `,
})
export class WinnersMarquee {
  readonly tournaments = input.required<Tournament[]>();

  protected readonly copies = [0, 1];

  protected readonly items = computed(() =>
    this.tournaments()
      .filter((t) => t.status === 'completed' && t.winners.length)
      .slice(0, MAX_ITEMS)
      .map((t) => ({
        id: t.id,
        title: t.title,
        game: t.game,
        rows: podiumRows(t.winners).slice(0, 3),
      })),
  );

  protected readonly duration = computed(() =>
    Math.max(40, this.items().length * SECONDS_PER_ITEM),
  );
}
