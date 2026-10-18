import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tf-credit-line',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      Made with <span class="heart">❤️</span> by <span class="handle">Speedy</span> (platoid:
      Speedy40)
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
  `,
})
export class CreditLine {}
