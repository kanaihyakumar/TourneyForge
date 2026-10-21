import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Organizer } from '../../core/models/models';
import { OrganizerService } from '../../core/services/organizer.service';
import { ToastService } from '../../core/services/toast.service';
import { Checkbox } from '../../shared/forms/checkbox';
import { Input } from '../../shared/forms/input';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-organizer-edit-modal',
  imports: [ReactiveFormsModule, Modal, Field, Input, Checkbox, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      title="Edit Organizer"
      [maxWidth]="420"
      [open]="!!organizer()"
      (openChange)="onOpenChange($event)"
    >
      <form class="stack" ngNativeValidate [formGroup]="form" (ngSubmit)="submit()">
        <tf-field label="Display name" for="editOrgDisplay">
          <tf-input inputId="editOrgDisplay" required formControlName="displayName" />
        </tf-field>
        <tf-field label="Username" for="editOrgUser">
          <tf-input inputId="editOrgUser" required formControlName="username" />
        </tf-field>
        <tf-checkbox formControlName="canManageOrganizers"
          >Allow this organizer to add more organizers</tf-checkbox
        >
        <tf-field label="Tournament limit" hint="(0 means unlimited)" for="editOrgLimit">
          <tf-input inputId="editOrgLimit" type="number" formControlName="maxTournaments" />
        </tf-field>
        @if (error()) {
          <p class="field-note error">{{ error() }}</p>
        }
        <div class="btn-row flush">
          <button type="submit" tfButton variant="primary" block>Save Changes</button>
        </div>
      </form>
    </tf-modal>
  `,
})
export class OrganizerEditModal {
  private readonly organizerService = inject(OrganizerService);
  private readonly toast = inject(ToastService);

  readonly organizer = model<Organizer | null>(null);
  readonly saved = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: '',
    username: '',
    canManageOrganizers: false,
    maxTournaments: '0',
  });
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      const org = this.organizer();
      if (!org) return;
      untracked(() => {
        this.error.set('');
        this.form.setValue({
          displayName: org.displayName,
          username: org.username,
          canManageOrganizers: !!org.canManageOrganizers,
          maxTournaments: String(org.maxTournaments ?? 0),
        });
      });
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.organizer.set(null);
  }

  protected async submit(): Promise<void> {
    const org = this.organizer();
    if (!org) return;
    const value = this.form.getRawValue();
    const username = value.username.trim();
    const organizers = await this.organizerService.list();
    const taken = organizers.some(
      (o) => o.id !== org.id && o.username.toLowerCase() === username.toLowerCase(),
    );
    if (taken) {
      this.error.set('That username is already taken.');
      return;
    }
    await this.organizerService.update(org.id, {
      ...value,
      username,
      maxTournaments: Number(value.maxTournaments) || 0,
    });
    this.organizer.set(null);
    this.saved.emit();
    this.toast.show('Organizer updated.');
  }
}
