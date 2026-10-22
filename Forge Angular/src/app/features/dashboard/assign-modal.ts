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
import { ADMIN_OWNER_NAME } from '../../core/config/constants';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Checkbox } from '../../shared/forms/checkbox';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-assign-modal',
  imports: [FormsModule, Modal, Checkbox, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      title="👤 Assign organizers"
      [maxWidth]="480"
      [open]="!!tournament()"
      (openChange)="onOpenChange($event)"
    >
      @if (tournament(); as t) {
        <div class="stack">
          <p class="line">
            <strong>{{ t.title }}</strong>
          </p>
          @if (organizers().length) {
            <p class="field-note">
              Tick every organizer who should have this tournament. Each one sees it and can manage
              it from their own dashboard.
            </p>
            <div class="cluster">
              @for (organizer of organizers(); track organizer.id) {
                <tf-checkbox
                  variant="chip"
                  [ngModel]="isSelected(organizer.id)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="toggle(organizer.id, $event)"
                >
                  {{ organizer.displayName }}
                  @if (organizer.id === primaryId()) {
                    ⭐
                  }
                </tf-checkbox>
              }
            </div>
            @if (selected().length) {
              <p class="field-note">
                ⭐ {{ primaryName() }} is the primary organizer and is credited as the host. The
                others are co-managers.
              </p>
            } @else {
              <p class="field-note">No organizer selected - the tournament belongs to Admin.</p>
            }
          } @else {
            <p class="field-note">
              No organizers yet. Create some in the Organizers tab, then assign them here.
            </p>
          }
          <div class="btn-row flush">
            <button
              type="button"
              tfButton
              variant="primary"
              [disabled]="busy() || !changed()"
              (click)="save()"
            >
              ✅ Save assignment
            </button>
            @if (selected().length) {
              <button type="button" tfButton [disabled]="busy()" (click)="clear()">
                ➖ Remove all
              </button>
            }
          </div>
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

  protected readonly selected = signal<string[]>([]);
  protected readonly busy = signal(false);

  protected readonly initial = computed(() => {
    const t = this.tournament();
    if (!t) return [];
    const ids = new Set(this.organizers().map((o) => o.id));
    return [t.organizerId, ...t.managerIds].filter(
      (id, i, all) => ids.has(id) && all.indexOf(id) === i,
    );
  });
  protected readonly primaryId = computed(() => {
    const picked = this.selected();
    const owner = this.tournament()?.organizerId;
    return owner && picked.includes(owner) ? owner : (picked[0] ?? '');
  });
  protected readonly primaryName = computed(
    () => this.organizers().find((o) => o.id === this.primaryId())?.displayName ?? ADMIN_OWNER_NAME,
  );
  protected readonly changed = computed(
    () => [...this.selected()].sort().join('|') !== [...this.initial()].sort().join('|'),
  );

  constructor() {
    effect(() => {
      const initial = this.initial();
      untracked(() => this.selected.set([...initial]));
    });
  }

  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: string, on: boolean): void {
    this.selected.update((ids) =>
      on ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id),
    );
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournament.set(null);
  }

  protected clear(): void {
    this.selected.set([]);
    void this.persist([]);
  }

  protected save(): void {
    void this.persist(this.selected());
  }

  private async persist(ids: string[]): Promise<void> {
    const t = this.tournament();
    if (!t) return;
    const owners = ids
      .map((id) => this.organizers().find((o) => o.id === id))
      .filter((o): o is Organizer => !!o)
      .map((o) => ({ id: o.id, displayName: o.displayName }));
    this.busy.set(true);
    try {
      const result = await this.tournaments.assign(t.id, owners, this.auth.session());
      if (!result) {
        this.toast.show('Could not update the assignment.');
        return;
      }
      this.toast.show(
        owners.length
          ? `Assigned to ${owners.map((o) => o.displayName).join(', ')}.`
          : 'Assignment removed - back to Admin.',
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
