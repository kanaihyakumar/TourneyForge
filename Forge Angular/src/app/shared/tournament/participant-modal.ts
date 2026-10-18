import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ParticipantTarget, SkippedParticipant } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { formatPlatoId, parseParticipantList } from '../../core/utils/plato';
import { registrationLabel } from '../../core/utils/tournament';
import { Input } from '../forms/input';
import { Textarea } from '../forms/textarea';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Modal } from '../ui/modal';
import { PillButton } from '../ui/pill-button';

@Component({
  selector: 'tf-participant-modal',
  imports: [ReactiveFormsModule, Modal, Field, Input, Textarea, Button, PillButton],
  styles: `
    .mode-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="isAdd() ? '➕ Add participant' : '🔁 Replace participant'"
      [maxWidth]="460"
      [open]="!!target()"
      (openChange)="onOpenChange($event)"
    >
      @if (isAdd()) {
        <p class="hint">
          Adds a participant to this tournament. They appear in the Forge page too.
        </p>
      } @else {
        <p class="hint">
          Replacing <strong>{{ currentLabel() }}</strong> updates the participants, bracket matches
          and winners everywhere.
        </p>
      }
      @if (isAdd() && canBulk()) {
        <div class="mode-row">
          <button type="button" tfPill [active]="!bulk()" (click)="bulk.set(false)">One</button>
          <button type="button" tfPill [active]="bulk()" (click)="bulk.set(true)">
            Several at once
          </button>
        </div>
      }
      @if (isAdd() && canBulk() && bulk()) {
        <form class="stack" [formGroup]="form" (ngSubmit)="submitBulk()">
          <tf-field
            [label]="isTeam() ? 'Teams (one per line, as Player & Partner)' : 'Plato IDs'"
            [hint]="isTeam() ? '' : '(one per line, or separated by commas)'"
            for="participantBulk"
          >
            <tf-textarea
              inputId="participantBulk"
              [minHeight]="140"
              [placeholder]="
                isTeam() ? 'Alice & Bob&#10;Cara & Dan' : 'ShadowFang&#10;LunaWolf&#10;Speedy40'
              "
              formControlName="bulk"
            />
          </tf-field>
          @if (error()) {
            <p class="field-note error">{{ error() }}</p>
          }
          @for (item of skipped(); track $index) {
            <p class="field-note error">{{ item.label }} - {{ item.reason }}</p>
          }
          <div class="btn-row flush">
            <button type="submit" tfButton variant="primary" block [disabled]="saving()">
              Add all
            </button>
          </div>
        </form>
      } @else {
        <form class="stack" ngNativeValidate [formGroup]="form" (ngSubmit)="submit()">
          <tf-field [label]="isTeam() ? 'Player Plato ID' : 'Plato ID'" for="participantPlatoId">
            <tf-input
              inputId="participantPlatoId"
              autocomplete="off"
              required
              formControlName="platoId"
            />
          </tf-field>
          @if (isTeam()) {
            <tf-field label="Partner Plato ID" for="participantPartnerId">
              <tf-input
                inputId="participantPartnerId"
                autocomplete="off"
                required
                formControlName="partnerId"
              />
            </tf-field>
            @if (!isAdd()) {
              <p class="field-note">Change either player, or both, to put in a substitute.</p>
            }
          }
          @if (error()) {
            <p class="field-note error">{{ error() }}</p>
          }
          <div class="btn-row flush">
            <button type="submit" tfButton variant="primary" block [disabled]="saving()">
              {{ isAdd() ? 'Add participant' : 'Replace' }}
            </button>
          </div>
        </form>
      }
    </tf-modal>
  `,
})
export class ParticipantModal {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly target = model<ParticipantTarget | null>(null);
  readonly saved = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    platoId: '',
    partnerId: '',
    bulk: '',
  });
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly bulk = signal(false);
  protected readonly skipped = signal<SkippedParticipant[]>([]);

  protected readonly canBulk = computed(() => this.auth.session()?.role === 'admin');
  protected readonly isAdd = computed(() => this.target()?.index === null);
  protected readonly isTeam = computed(() => this.target()?.tournament.teamSize === 2);
  protected readonly currentLabel = computed(() => {
    const target = this.target();
    if (!target || target.index === null) return '';
    const entry = target.tournament.registrations[target.index];
    return entry ? formatPlatoId(registrationLabel(entry, target.tournament.teamSize)) : '';
  });

  constructor() {
    effect(() => {
      const target = this.target();
      if (!target) return;
      untracked(() => {
        const entry =
          target.index === null ? undefined : target.tournament.registrations[target.index];
        this.error.set('');
        this.skipped.set([]);
        this.bulk.set(false);
        this.form.setValue({
          bulk: '',
          platoId: entry?.platoId ?? '',
          partnerId: entry?.partnerPlatoId ?? '',
        });
      });
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.target.set(null);
  }

  protected async submitBulk(): Promise<void> {
    const target = this.target();
    if (!target || !this.canBulk()) return;
    const entries = parseParticipantList(this.form.getRawValue().bulk, this.isTeam());
    this.error.set('');
    this.skipped.set([]);
    if (!entries.length) {
      this.error.set('⚠️ Enter at least one Plato ID.');
      return;
    }
    this.saving.set(true);
    try {
      const result = await this.tournaments.addParticipants(
        target.tournament.id,
        entries,
        this.auth.session(),
      );
      if (result.added) this.saved.emit();
      if (!result.skipped.length && result.ok) {
        this.target.set(null);
        this.toast.show(result.message);
        return;
      }
      if (!result.ok && !result.skipped.length) this.error.set('⚠️ ' + result.message);
      this.skipped.set(result.skipped);
      if (result.added) this.toast.show(`${result.message} Fix the rest below.`);
      this.form.controls.bulk.setValue(result.skipped.map((s) => s.label).join('\n'));
    } catch (err) {
      this.error.set('⚠️ Something went wrong - please try again.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  protected async submit(): Promise<void> {
    const target = this.target();
    if (!target) return;
    const { platoId, partnerId } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    try {
      const session = this.auth.session();
      const result =
        target.index === null
          ? await this.tournaments.addParticipant(target.tournament.id, platoId, partnerId, session)
          : await this.tournaments.replaceParticipant(
              target.tournament.id,
              target.index,
              platoId,
              partnerId,
              session,
            );
      if (!result.ok) {
        this.error.set('⚠️ ' + result.message);
        return;
      }
      this.target.set(null);
      this.toast.show(result.message);
      this.saved.emit();
    } catch (err) {
      this.error.set('⚠️ Something went wrong - please try again.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }
}
