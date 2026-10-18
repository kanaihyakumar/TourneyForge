import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Input } from '../shared/forms/input';
import { Button } from '../shared/ui/button';
import { Field } from '../shared/ui/field';
import { Modal } from '../shared/ui/modal';

@Component({
  selector: 'tf-login-modal',
  imports: [ReactiveFormsModule, Modal, Field, Input, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal title="🔐 Sign in" [open]="auth.loginOpen()" (openChange)="onOpenChange($event)">
      <p class="hint">
        Admin and organizer accounts only. Participants don’t need an account - just register with
        your Plato ID on a tournament card.
      </p>
      <form class="stack" ngNativeValidate [formGroup]="form" (ngSubmit)="submit()">
        <tf-field label="Username" for="tfLoginUser">
          <tf-input
            #user
            inputId="tfLoginUser"
            autocomplete="username"
            required
            formControlName="username"
          />
        </tf-field>
        <tf-field label="Password" for="tfLoginPass">
          <tf-input
            inputId="tfLoginPass"
            type="password"
            autocomplete="current-password"
            required
            formControlName="password"
          />
        </tf-field>
        @if (error()) {
          <p class="field-note error">{{ error() }}</p>
        }
        <div class="btn-row flush">
          <button type="submit" tfButton variant="primary" block [disabled]="submitting()">
            {{ submitting() ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </tf-modal>
  `,
})
export class LoginModal {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({ username: '', password: '' });
  protected readonly error = signal('');
  protected readonly submitting = signal(false);
  private readonly userField = viewChild<Input>('user');

  constructor() {
    effect(() => {
      if (!this.auth.loginOpen()) return;
      this.error.set('');
      this.form.reset();
      queueMicrotask(() => this.userField()?.focus());
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.auth.closeLogin();
  }

  protected async submit(): Promise<void> {
    const { username, password } = this.form.getRawValue();
    this.error.set('');
    this.submitting.set(true);
    try {
      const session = await this.auth.login(username, password);
      if (!session) {
        this.error.set('Incorrect username or password. Try again.');
        return;
      }
      this.auth.closeLogin();
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error.set('Could not reach the database. Check your connection and try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
