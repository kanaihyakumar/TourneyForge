import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_OWNER_ID, ADMIN_OWNER_NAME } from '../../core/config/constants';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Select } from '../../shared/forms/select';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-assign-modal',
  imports: [FormsModule, Modal, Field, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      title="👤 Assign tournament"
      [maxWidth]="460"
      [open]="!!tournament()"
      (openChange)="onOpenChange($event)"
    >
      @if (tournament(); as t) {
        <div class="stack">
          <p class="line">
            <strong>{{ t.title }}</strong>
          </p>
          <p class="field-note">
            Currently assigned to
            <strong>{{ assignedName() }}</strong
            >.
            @if (!assignedToAdmin()) {
              They can see and manage it from their dashboard.
            }
          </p>
          @if (organizers().length) {
            <tf-field label="Assign to organizer" for="assignOwner">
              <tf-select
                inputId="assignOwner"
                [options]="options()"
                [ngModel]="choice()"
                (ngModelChange)="choice.set($event)"
              />
            </tf-field>
          } @else {
            <p class="field-note">
              No organizers yet. Create one in the Organizers tab, then assign this tournament.
            </p>
          }
          <div class="btn-row flush">
            <button
              type="button"
              tfButton
              variant="primary"
              [disabled]="busy() || !canAssign()"
              (click)="assign()"
            >
              ✅ Assign
            </button>
            @if (!assignedToAdmin()) {
              <button
                type="button"
                tfButton
                variant="danger"
                [disabled]="busy()"
                (click)="remove()"
              >
                ➖ Remove assignment
              </button>
            }
          </div>
          <p class="field-note">
            Removing the assignment moves the tournament back to Admin. It counts toward the
            assigned organizer's tournament limit while they own it.
          </p>
        </div>
      }
    </tf-modal>
  `,
  styles: `
    .line {
      margin: 0;
    }
  `,
})
export class AssignModal {
  private readonly tournaments = inject(TournamentService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly tournament = model<Tournament | null>(null);
  readonly organizers = input<Organizer[]>([]);
  readonly assigned = output<void>();

  protected readonly choice = signal('');
  protected readonly busy = signal(false);

  protected readonly options = computed(() =>
    this.organizers().map((o) => ({ value: o.id, label: `${o.displayName} (@${o.username})` })),
  );
  protected readonly assignedToAdmin = computed(
    () => (this.tournament()?.organizerId ?? ADMIN_OWNER_ID) === ADMIN_OWNER_ID,
  );
  protected readonly assignedName = computed(() => {
    const t = this.tournament();
    if (!t || this.assignedToAdmin()) return ADMIN_OWNER_NAME;
    return this.organizers().find((o) => o.id === t.organizerId)?.displayName ?? t.organizerName;
  });
  protected readonly canAssign = computed(
    () => !!this.choice() && this.choice() !== this.tournament()?.organizerId,
  );

  constructor() {
    effect(() => {
      const t = this.tournament();
      const list = this.organizers();
      untracked(() => {
        const current = list.find((o) => o.id === t?.organizerId);
        this.choice.set(current?.id ?? list[0]?.id ?? '');
      });
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournament.set(null);
  }

  protected assign(): void {
    const owner = this.organizers().find((o) => o.id === this.choice());
    if (owner) void this.save({ id: owner.id, displayName: owner.displayName });
  }

  protected remove(): void {
    void this.save(null);
  }

  private async save(owner: { id: string; displayName: string } | null): Promise<void> {
    const t = this.tournament();
    if (!t) return;
    this.busy.set(true);
    try {
      const result = await this.tournaments.assign(t.id, owner, this.auth.session());
      if (!result) {
        this.toast.show('Could not update the assignment.');
        return;
      }
      this.toast.show(
        owner ? `Assigned to ${owner.displayName}.` : 'Assignment removed - back to Admin.',
      );
      this.tournament.set(null);
      this.assigned.emit();
    } catch (err) {
      this.toast.show('Something went wrong updating the assignment.');
      console.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
