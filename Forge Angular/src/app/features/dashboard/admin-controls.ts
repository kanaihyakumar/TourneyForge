import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MIN_ADMIN_PASSWORD } from '../../core/config/constants';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Input } from '../../shared/forms/input';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { Field } from '../../shared/ui/field';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'tf-admin-controls',
  imports: [ReactiveFormsModule, Card, Button, Modal, Field, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-card
      icon="🛡️"
      title="Admin controls"
      hint="Only you can see this. Signing organizers out is handy right after you remove someone."
    >
      <div class="btn-row flush">
        <button type="button" tfButton size="sm" [disabled]="busy()" (click)="logoutAll()">
          🚪 Log out all organizers
        </button>
        <button type="button" tfButton size="sm" (click)="openPassword()">
          🔑 Change my password
        </button>
      </div>
      <p class="field-note">
        Logging everyone out ends every organizer session within a few minutes, or straight away the
        next time they open the site. They can log in again with their own account, and removed
        organizers can't.
      </p>
    </tf-card>

    <tf-modal title="🔑 Change my password" [maxWidth]="420" [(open)]="passwordOpen">
      <form class="stack" ngNativeValidate [formGroup]="form" (ngSubmit)="changePassword()">
        <tf-field label="Current password" for="adminPwCurrent">
          <tf-input
            inputId="adminPwCurrent"
            type="password"
            autocomplete="current-password"
            required
            formControlName="current"
          />
        </tf-field>
        <tf-field label="New password" for="adminPwNew">
          <tf-input
            inputId="adminPwNew"
            type="password"
            autocomplete="new-password"
            required
            formControlName="next"
          />
        </tf-field>
        <tf-field label="Confirm new password" for="adminPwConfirm">
          <tf-input
            inputId="adminPwConfirm"
            type="password"
            autocomplete="new-password"
            required
            formControlName="confirm"
          />
        </tf-field>
        @if (error()) {
          <p class="field-note error">{{ error() }}</p>
        }
        <div class="btn-row flush">
          <button type="submit" tfButton variant="primary" block [disabled]="busy()">
            Save new password
          </button>
        </div>
      </form>
    </tf-modal>
  `,
})
export class AdminControls {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    current: '',
    next: '',
    confirm: '',
  });
  protected readonly passwordOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected openPassword(): void {
    this.form.reset();
    this.error.set('');
    this.passwordOpen.set(true);
  }

  protected async logoutAll(): Promise<void> {
    if (
      !confirm(
        'Log out every organizer? They will need to log in again. Removed organizers will not be able to.',
      )
    ) {
      return;
    }
    this.busy.set(true);
    try {
      const ok = await this.auth.logoutAllOrganizers();
      this.toast.show(ok ? 'All organizers will be logged out.' : 'Only an admin can do this.');
    } catch (err) {
      this.toast.show('Could not log organizers out - check your connection.');
      console.error(err);
    } finally {
      this.busy.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    const { current, next, confirm: again } = this.form.getRawValue();
    if (next !== again) {
      this.error.set('The new passwords do not match.');
      return;
    }
    if (next === current) {
      this.error.set('Choose a password that is different from the current one.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.changeAdminPassword(current, next);
      if (result === 'ok') {
        this.passwordOpen.set(false);
        this.toast.show('Your password was changed.');
      } else {
        this.error.set(
          result === 'wrong'
            ? 'The current password is not correct.'
            : result === 'weak'
              ? `Use at least ${MIN_ADMIN_PASSWORD} characters for the new password.`
              : 'Only an admin can change this password.',
        );
      }
    } catch (err) {
      this.error.set('Something went wrong - check your connection and try again.');
      console.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
