import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { OrganizerService } from '../../core/services/organizer.service';
import { ToastService } from '../../core/services/toast.service';
import { organizerCounts } from '../../core/utils/tournament';
import { Checkbox } from '../../shared/forms/checkbox';
import { Input } from '../../shared/forms/input';
import { PasswordGenerator } from '../../shared/forms/password-generator';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { Field } from '../../shared/ui/field';
import { ListRow } from '../../shared/ui/list-row';
import { Tag } from '../../shared/ui/tag';
import { AdminControls } from './admin-controls';
import { OrganizerEditModal } from './organizer-edit-modal';
import { PasswordModal } from './password-modal';

@Component({
  selector: 'tf-organizers-panel',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    Card,
    Field,
    Input,
    Checkbox,
    Button,
    ListRow,
    Tag,
    OrganizerEditModal,
    AdminControls,
    PasswordGenerator,
    PasswordModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organizers-panel.html',
})
export class OrganizersPanel {
  private readonly organizerService = inject(OrganizerService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  readonly organizers = input<Organizer[] | undefined>(undefined);
  readonly tournaments = input<Tournament[]>([]);

  protected readonly counts = computed(() => organizerCounts(this.tournaments()));
  readonly error = input(false);
  readonly changed = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: '',
    username: '',
    password: '',
    canManageOrganizers: false,
    maxTournaments: '0',
  });
  protected readonly editing = signal<Organizer | null>(null);
  protected readonly resetting = signal<Organizer | null>(null);

  protected async create(): Promise<void> {
    const value = this.form.getRawValue();
    const username = value.username.trim();
    try {
      const existing = await this.organizerService.list();
      if (existing.some((o) => o.username.toLowerCase() === username.toLowerCase())) {
        this.toast.show('That username is already taken.');
        return;
      }
      await this.organizerService.create(
        {
          ...value,
          username,
          canManageOrganizers: this.auth.isAdmin() && value.canManageOrganizers,
          maxTournaments: this.auth.isAdmin() ? Number(value.maxTournaments) || 0 : 0,
        },
        this.auth.session(),
      );
      this.form.reset({ maxTournaments: '0' });
      this.changed.emit();
      this.toast.show('Organizer created!');
    } catch (err) {
      this.toast.show('Something went wrong creating the organizer.');
      console.error(err);
    }
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('Delete this organizer? Their tournaments will transfer to Admin.')) return;
    await this.organizerService.remove(id);
    this.changed.emit();
    this.toast.show('Organizer deleted.');
  }
}
