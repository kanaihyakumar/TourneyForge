import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NewGamesService } from '../core/services/new-games.service';
import { Banner } from '../shared/ui/banner';
import { Button } from '../shared/ui/button';

@Component({
  selector: 'tf-new-games-banner',
  imports: [Banner, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (games.unseen().length) {
      <tf-banner icon="🎮" flush spread>
        <span class="title">✨ New game added!</span>
        @for (game of games.unseen(); track game.name) {
          <span class="line">
            <strong>{{ game.name }}</strong> - {{ game.tagline }}
          </span>
        }
        <button bannerAside type="button" tfButton size="sm" (click)="games.dismiss()">
          Got it
        </button>
      </tf-banner>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .title {
      display: block;
      font-weight: 900;
      color: var(--accent-dark);
    }

    .line {
      display: block;
      font-size: 0.86rem;
      line-height: 1.45;
    }
  `,
})
export class NewGamesBanner {
  protected readonly games = inject(NewGamesService);
}
