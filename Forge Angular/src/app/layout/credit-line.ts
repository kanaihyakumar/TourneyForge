import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACT_DISCORD_ID, CONTACT_PLATO_ID, DISCORD_ICON } from '../core/config/constants';

@Component({
  selector: 'tf-credit-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      Made with <span class="heart">❤️</span> by <span class="handle">Speedy</span>
      <span class="ids">(platoid: {{ platoId }} · {{ discordIcon }} discord: {{ discordId }})</span>
    </div>
    <div class="thanks">
      Enjoying TourneyForge? Show some love - send Speedy an ✨ aura or a 🎁 gift on Plato. It keeps
      the arena running!
    </div>
  `,
  styles: `
    :host {
      display: block;
      text-align: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-soft);
      margin: 0 0 32px;
      line-height: 1.5;
    }

    .heart {
      color: var(--danger);
    }

    .handle {
      color: var(--accent-dark);
    }

    @media (max-width: 640px) {
      :host {
        margin-bottom: 16px;
      }

      .ids {
        display: none;
      }
    }
  `,
})
export class CreditLine {
  protected readonly platoId = CONTACT_PLATO_ID;
  protected readonly discordId = CONTACT_DISCORD_ID;
  protected readonly discordIcon = DISCORD_ICON;
}
