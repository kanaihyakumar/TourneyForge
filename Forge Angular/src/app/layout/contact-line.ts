import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACT_DISCORD_ID, CONTACT_PLATO_ID, DISCORD_ICON } from '../core/config/constants';

@Component({
  selector: 'tf-contact-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    Want to use TourneyForge for your own group? Contact <span class="handle">Speedy</span> on Plato
    (platoid: {{ platoId }}) or on Discord ({{ discordIcon }} {{ discordId }}).
  `,
  styles: `
    :host {
      display: block;
      text-align: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-soft);
      margin: 36px 0 0;
      padding: 16px 0 8px;
      line-height: 1.5;
    }

    .handle {
      color: var(--accent-dark);
    }
  `,
})
export class ContactLine {
  protected readonly platoId = CONTACT_PLATO_ID;
  protected readonly discordId = CONTACT_DISCORD_ID;
  protected readonly discordIcon = DISCORD_ICON;
}
