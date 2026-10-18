import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Tournament } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { normalizePlatoId } from '../../core/utils/plato';
import { Input } from '../../shared/forms/input';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';

@Component({
  selector: 'tf-register-form',
  imports: [ReactiveFormsModule, Field, Input, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form ngNativeValidate [formGroup]="form" (ngSubmit)="submit()">
      <tf-field label="Your Plato ID" for="platoIdInput">
        <tf-input
          #platoId
          inputId="platoIdInput"
          placeholder="e.g. ShadowFang"
          autocomplete="off"
          required
          formControlName="platoId"
        />
      </tf-field>
      @if (isTeam()) {
        <tf-field label="Your Partner’s Plato ID" for="partnerIdInput">
          <tf-input
            inputId="partnerIdInput"
            placeholder="e.g. LunaWolf"
            autocomplete="off"
            required
            formControlName="partnerId"
          />
        </tf-field>
        <p class="field-note">
          👥 This is a 2v2 tournament - register together with your partner, you’ll be matched up as
          one team.
        </p>
      }
      <p class="field-note">
        ⚠️ Make sure your Plato ID{{ isTeam() ? ' and your partner’s' : '' }} is correct - if it’s
        wrong, you won’t be selected as part of the tournament.
      </p>
      @if (error()) {
        <p class="field-note error">{{ error() }}</p>
      }
      <div class="btn-row">
        <button type="submit" tfButton variant="primary" block [disabled]="submitting()">
          ⚔️ Confirm Registration
        </button>
      </div>
    </form>
  `,
  styles: `
    tf-field {
      margin-bottom: 8px;
    }
  `,
})
export class RegisterForm {
  private readonly tournaments = inject(TournamentService);
  private readonly toast = inject(ToastService);

  readonly tournament = input.required<Tournament>();
  readonly autofocus = input(false);
  readonly registered = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({ platoId: '', partnerId: '' });
  protected readonly error = signal('');
  protected readonly submitting = signal(false);
  private readonly platoIdField = viewChild<Input>('platoId');

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) this.platoIdField()?.focus();
    });
  }

  protected isTeam(): boolean {
    return this.tournament().teamSize === 2;
  }

  protected async submit(): Promise<void> {
    const { platoId, partnerId } = this.form.getRawValue();
    const teamError = this.isTeam() ? this.validateTeam(platoId, partnerId) : '';
    this.error.set(teamError);
    if (teamError) return;

    this.submitting.set(true);
    try {
      const result = await this.tournaments.register(
        this.tournament().id,
        platoId,
        this.isTeam() ? partnerId : undefined,
      );
      if (result.ok) {
        this.toast.show(result.message);
        this.registered.emit();
      } else {
        this.error.set('⚠️ ' + result.message);
      }
    } catch (err) {
      this.error.set('⚠️ Something went wrong - please try again.');
      console.error(err);
    } finally {
      this.submitting.set(false);
    }
  }

  private validateTeam(platoId: string, partnerId: string): string {
    if (!partnerId.trim())
      return '⚠️ Please add your partner’s Plato ID - this is a 2v2 tournament.';
    const normalized = normalizePlatoId(platoId);
    if (normalized && normalized === normalizePlatoId(partnerId)) {
      return '⚠️ Your Plato ID and your partner’s Plato ID can’t be the same.';
    }
    return '';
  }
}
