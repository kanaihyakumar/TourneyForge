import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  model,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Organizer } from '../../core/models/models';
import { OrganizerService } from '../../core/services/organizer.service';
import { ToastService } from '../../core/services/toast.service';
import { Input } from '../../shared/forms/input';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-password-modal',
  imports: [ReactiveFormsModule, Modal, Field, Input, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      title="Reset Password"
      [maxWidth]="420"
      [open]="!!organizer()"
      (openChange)="onOpenChange($event)"
    >
      <form class="stack" ngNativeValidate [formGroup]="form" (ngSubmit)="submit()">
        <tf-field label="New password" for="pwNewInput">
          <tf-input inputId="pwNewInput" required formControlName="password" />
        </tf-field>
        <div class="btn-row flush">
          <button type="submit" tfButton variant="primary" block>Reset Password</button>
        </div>
      </form>
    </tf-modal>
  `,
})
export class PasswordModal {
  private readonly organizerService = inject(OrganizerService);
  private readonly toast = inject(ToastService);

  readonly organizer = model<Organizer | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({ password: '' });

  constructor() {
    effect(() => {
      if (this.organizer()) untracked(() => this.form.reset());
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.organizer.set(null);
  }

  protected async submit(): Promise<void> {
    const org = this.organizer();
    if (!org) return;
    await this.organizerService.resetPassword(org.id, this.form.getRawValue().password);
    this.organizer.set(null);
    this.toast.show('Password reset.');
  }
}
