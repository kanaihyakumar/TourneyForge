import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { CONTACT_DISCORD_ID, CONTACT_PLATO_ID, DISCORD_ICON } from '../../core/config/constants';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-publish-confirm-modal',
  imports: [Modal, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal title="🏆 Publish this tournament?" [maxWidth]="460" [(open)]="open">
      <div class="stack">
        <p>Are you sure you want to publish this tournament?</p>
        <ul>
          <li>
            Once published, it <strong>cannot be edited</strong>, and organizers can't delete it.
          </li>
          <li>You can still record the winners and closing message afterwards.</li>
          <li>
            To change anything else, contact <strong>Speedy</strong> on Plato (platoid:
            {{ platoId }}) or on Discord ({{ discordIcon }} {{ discordId }}) and ask for edit
            access.
          </li>
        </ul>
        <div class="btn-row flush">
          <button type="button" tfButton variant="primary" (click)="confirm()">
            ✅ Yes, publish
          </button>
          <button type="button" tfButton (click)="dismiss()">Go back</button>
        </div>
      </div>
    </tf-modal>
  `,
  styles: `
    p,
    ul {
      margin: 0;
    }

    ul {
      padding-left: 20px;
      line-height: 1.6;
      color: var(--text-soft);
      font-weight: 600;
    }
  `,
})
export class PublishConfirmModal {
  readonly open = model(false);
  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  protected readonly platoId = CONTACT_PLATO_ID;
  protected readonly discordId = CONTACT_DISCORD_ID;
  protected readonly discordIcon = DISCORD_ICON;

  protected confirm(): void {
    this.open.set(false);
    this.confirmed.emit();
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }
}
