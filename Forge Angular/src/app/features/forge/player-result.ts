import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WerewolfSide } from '../../core/models/models';
import { isAdvancing, markOf, pointsFor, resultOf } from '../../core/utils/scoring';
import { ForgeStore } from './forge-store';

interface Choice {
  side: WerewolfSide;
  won: boolean;
  icon: string;
  title: string;
}

const CHOICES: Choice[] = [
  { side: 'villagers', won: true, icon: '🏘️✓', title: 'Villager won' },
  { side: 'villagers', won: false, icon: '🏘️✗', title: 'Villager lost' },
  { side: 'werewolves', won: true, icon: '🐺✓', title: 'Werewolf won' },
  { side: 'werewolves', won: false, icon: '🐺✗', title: 'Werewolf lost' },
];

@Component({
  selector: 'tf-player-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (choice of choices; track choice.title) {
      <button
        type="button"
        [class.on]="isActive(choice)"
        [title]="choice.title"
        [attr.aria-label]="choice.title + ' - ' + name()"
        (click)="choose(choice)"
      >
        {{ choice.icon }}
      </button>
    }
    <span class="points" title="Points in this game / total">
      @if (eligible()) {
        @if (gamePoints() !== null) {
          <span class="gain">{{ gamePoints()! >= 0 ? '+' : '' }}{{ gamePoints() }}</span> ·
        }
        ⭐ {{ total() }} pts
      } @else {
        not advancing - no points · ⭐ {{ total() }} pts
      }
    </span>
    <span class="cats">
      <button
        type="button"
        class="cat"
        [class.on]="category() === 'pro'"
        title="Pro - smart play, points added"
        [attr.aria-label]="'Pro - ' + name()"
        (click)="setCategory('pro')"
      >
        Pro
      </button>
      <button
        type="button"
        class="cat"
        [class.on]="category() === 'nab'"
        title="Nab - weak play, points deducted"
        [attr.aria-label]="'Nab - ' + name()"
        (click)="setCategory('nab')"
      >
        Nab
      </button>
    </span>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin: 4px 0 6px;
    }

    button {
      @include reset-button;
      @include neu-surface(2px, var(--radius-pill));
      padding: 3px 9px;
      font-size: 0.74rem;
      font-weight: 800;
      color: var(--text-soft);
      opacity: 0.6;
    }

    button.on {
      @include neu-inset(2px);
      opacity: 1;
      color: var(--accent-dark);
    }

    .points {
      margin-left: auto;
      align-self: center;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--text-soft);
    }

    .gain {
      color: var(--success);
    }

    .cats {
      display: flex;
      gap: 6px;
    }
  `,
})
export class PlayerResult {
  private readonly store = inject(ForgeStore);

  readonly gameRef = input.required<string>();
  readonly label = input.required<string>();
  readonly players = input.required<string[]>();
  readonly name = input.required<string>();

  protected readonly choices = CHOICES;
  protected readonly current = computed(() => {
    const game = this.store.gameFor(this.gameRef());
    return game ? resultOf(game, this.name()) : null;
  });
  protected readonly category = computed(() => {
    const game = this.store.gameFor(this.gameRef());
    return game ? markOf(game, this.name()) : null;
  });
  protected readonly eligible = computed(() =>
    isAdvancing(this.store.stages(), this.gameRef(), this.name()),
  );
  protected readonly gamePoints = computed(() => {
    const game = this.store.gameFor(this.gameRef());
    const config = this.store.scoring();
    return game && config && this.eligible() && (resultOf(game, this.name()) || this.category())
      ? pointsFor(game, this.name(), config)
      : null;
  });
  protected readonly total = computed(() => this.store.pointsOf(this.name()).total);

  protected isActive(choice: Choice): boolean {
    const current = this.current();
    return !!current && current.side === choice.side && current.won === choice.won;
  }

  protected choose(choice: Choice): void {
    const clear = this.isActive(choice);
    this.store.setPlayerResult(
      this.gameRef(),
      this.label(),
      this.players(),
      this.name(),
      clear ? null : choice.side,
      clear ? null : choice.won,
    );
  }

  protected setCategory(category: 'pro' | 'nab'): void {
    this.store.setMark(
      this.gameRef(),
      this.label(),
      this.players(),
      this.name(),
      this.category() === category ? null : category,
    );
  }
}
