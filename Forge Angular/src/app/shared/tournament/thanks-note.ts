import { ChangeDetectionStrategy, Component } from '@angular/core';
import { THANKS_MESSAGE, THANKS_NOTE } from '../../core/config/constants';
import { ChunkCopy } from '../ui/chunk-copy';

@Component({
  selector: 'tf-thanks-note',
  imports: [ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="note">
      <span class="heart" aria-hidden="true">💜</span>
      {{ note }} <strong>Speedy40</strong>
    </p>
    <tf-chunk-copy [chunks]="[message]" label="Copy thank-you message" tone="accent" />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      @include neu-well(3px);
      padding: 14px 16px;
      margin-top: 14px;
    }

    .note {
      margin: 0;
      font-size: 0.84rem;
      font-weight: 700;
      line-height: 1.5;
      color: var(--text-soft);
    }

    strong {
      color: var(--accent-dark);
    }
  `,
})
export class ThanksNote {
  protected readonly note = THANKS_NOTE;
  protected readonly message = THANKS_MESSAGE;
}
