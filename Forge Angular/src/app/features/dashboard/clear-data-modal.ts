import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ClearOptions } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { estimateBytes, formatBytes } from '../../core/utils/size';
import { Checkbox } from '../../shared/forms/checkbox';
import { Button } from '../../shared/ui/button';
import { Modal } from '../../shared/ui/modal';

export const CLEAR_CHOICES: { key: keyof ClearOptions; label: string }[] = [
  { key: 'registrations', label: 'Participants' },
  { key: 'forgeState', label: 'Bracket & match data' },
  { key: 'winners', label: 'Winners' },
  { key: 'closingMessage', label: 'Closing message' },
  { key: 'details', label: 'Rules / registration details' },
];

@Component({
  selector: 'tf-clear-data-modal',
  imports: [ReactiveFormsModule, Modal, Checkbox, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="'🧹 Clear data - ' + (tournament.value()?.title ?? '')"
      [maxWidth]="480"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      <p class="hint">
        Permanently removes the selected data from this tournament to free up database space. The
        tournament itself stays.
      </p>
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        @for (choice of choices; track choice.key) {
          <tf-checkbox [formControlName]="choice.key">
            {{ choice.label }} <span class="size">({{ sizes()[choice.key] }})</span>
          </tf-checkbox>
        }
        <p class="field-note">Selected data to free: about {{ freed() }}. This cannot be undone.</p>
        <div class="btn-row flush">
          <button
            type="submit"
            tfButton
            variant="danger"
            block
            [disabled]="saving() || !anySelected()"
          >
            🧹 Clear selected data
          </button>
        </div>
      </form>
    </tf-modal>
  `,
  styles: `
    .size {
      color: var(--text-soft);
      font-weight: 600;
    }
  `,
})
export class ClearDataModal {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly tournamentId = model<string | null>(null);
  readonly cleared = output<void>();

  protected readonly choices = CLEAR_CHOICES;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    registrations: true,
    forgeState: true,
    winners: false,
    closingMessage: false,
    details: false,
  });
  protected readonly saving = signal(false);
  private readonly selection = signal<ClearOptions>(this.form.getRawValue());

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });
  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());

  protected readonly sizes = computed(() => {
    const t = this.tournament.value();
    const sizeOf = (value: unknown) => formatBytes(estimateBytes(value));
    return {
      registrations: sizeOf(t?.registrations ?? []),
      forgeState: sizeOf(t?.forgeState ?? null),
      winners: sizeOf(t?.winners ?? []),
      closingMessage: sizeOf(t?.closingMessage ?? ''),
      details: sizeOf(t?.details ?? ''),
    };
  });
  protected readonly freed = computed(() => {
    const t = this.tournament.value();
    const s = this.selection();
    if (!t) return formatBytes(0);
    const total =
      (s.registrations ? estimateBytes(t.registrations) : 0) +
      (s.forgeState ? estimateBytes(t.forgeState ?? null) : 0) +
      (s.winners ? estimateBytes(t.winners) : 0) +
      (s.closingMessage ? estimateBytes(t.closingMessage) : 0) +
      (s.details ? estimateBytes(t.details) : 0);
    return formatBytes(total);
  });
  protected readonly anySelected = computed(() => Object.values(this.selection()).some(Boolean));

  constructor() {
    this.form.valueChanges.subscribe(() => this.selection.set(this.form.getRawValue()));
    effect(() => {
      if (this.open()) {
        untracked(() => {
          this.form.reset();
          this.selection.set(this.form.getRawValue());
        });
      }
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }

  protected async submit(): Promise<void> {
    const id = this.tournamentId();
    if (!id || !confirm('Clear the selected data? This cannot be undone.')) return;
    this.saving.set(true);
    try {
      const ok = await this.tournaments.clearData(id, this.form.getRawValue(), this.auth.session());
      this.toast.show(ok ? 'Data cleared.' : 'Could not clear - check permissions.');
      if (ok) {
        this.tournamentId.set(null);
        this.cleared.emit();
      }
    } catch (err) {
      this.toast.show('Something went wrong clearing the data.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }
}
