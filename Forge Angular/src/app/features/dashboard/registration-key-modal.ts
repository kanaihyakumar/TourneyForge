import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { Tournament } from '../../core/models/models';
import { RegistrationKeyPanel } from '../../shared/tournament/registration-key-panel';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-registration-key-modal',
  imports: [Modal, RegistrationKeyPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      title="🔑 Registration key"
      [maxWidth]="500"
      [open]="!!tournament()"
      (openChange)="onOpenChange($event)"
    >
      <tf-registration-key-panel [tournament]="tournament()" (changed)="changed.emit()" />
    </tf-modal>
  `,
})
export class RegistrationKeyModal {
  readonly tournament = model<Tournament | null>(null);
  readonly changed = output<void>();

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournament.set(null);
  }
}
