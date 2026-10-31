import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { registrationFullMessage, registrationMessage } from '../../core/utils/messages';
import { isFull } from '../../core/utils/tournament';
import { Button } from '../ui/button';
import { ChunkCopy } from '../ui/chunk-copy';

@Component({
  selector: 'tf-registration-key-panel',
  imports: [Button, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tournament(); as t) {
      <div class="stack">
        <p class="line">
          <strong>{{ t.title }}</strong>
        </p>
        @if (loading()) {
          <p class="field-note">Loading…</p>
        } @else if (key()) {
          <p class="field-note">
            Players need this key plus their Plato ID to register, so people from other groups who
            find the site can't join. Share it only in your group, when registration opens.
          </p>
          <div class="key" aria-label="Registration key">{{ key() }}</div>
          <div class="btn-row flush">
            <tf-chunk-copy [chunks]="[key()]" label="Copy key" />
            <tf-chunk-copy [chunks]="[message()]" label="Copy registration message" primary />
            @if (full()) {
              <tf-chunk-copy [chunks]="[fullMessage()]" label="Copy registration full message" />
            }
          </div>
          <div class="preview">{{ message() }}</div>
          <div class="btn-row flush">
            <button type="button" tfButton size="sm" [disabled]="busy()" (click)="renew()">
              🔄 New key
            </button>
            <button type="button" tfButton size="sm" [disabled]="busy()" (click)="disable()">
              🚫 Turn off key
            </button>
          </div>
          <p class="field-note">
            A new key stops the old one working. Players already registered are not affected.
          </p>
        } @else {
          <p class="field-note">
            This tournament has no registration key, so anyone with the link can register.
          </p>
          <div class="btn-row flush">
            <button type="button" tfButton variant="primary" [disabled]="busy()" (click)="renew()">
              🔑 Require a key
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    @use 'mixins' as *;

    .line {
      margin: 0;
    }

    .key {
      @include neu-well(4px);
      text-align: center;
      font-size: 2.2rem;
      font-weight: 900;
      letter-spacing: 0.35em;
      padding: 16px 0 16px 0.35em;
      color: var(--accent-dark);
    }

    .preview {
      @include neu-well(3px);
      padding: 12px 14px;
      font-size: 0.86rem;
      font-weight: 600;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class RegistrationKeyPanel {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly tournament = input<Tournament | null>(null);
  readonly changed = output<void>();

  protected readonly key = signal('');
  protected readonly loading = signal(false);
  protected readonly busy = signal(false);

  protected readonly message = computed(() => {
    const t = this.tournament();
    return t && this.key() ? registrationMessage(t, this.key(), location.origin) : '';
  });

  protected readonly full = computed(() => {
    const t = this.tournament();
    return !!t && isFull(t);
  });

  protected readonly fullMessage = computed(() => {
    const t = this.tournament();
    return t ? registrationFullMessage(t) : '';
  });

  constructor() {
    effect(() => {
      const t = this.tournament();
      untracked(() => {
        this.key.set('');
        if (t) void this.load(t.id);
      });
    });
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.key.set((await this.tournaments.getKey(id, this.auth.session())) ?? '');
    } catch (err) {
      this.toast.show('Could not load the key - check your connection.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  protected async renew(): Promise<void> {
    const t = this.tournament();
    if (!t) return;
    if (
      this.key() &&
      !confirm('Create a new key? The current key will stop working for new registrations.')
    ) {
      return;
    }
    await this.run(async () => {
      const key = await this.tournaments.renewKey(t.id, this.auth.session());
      if (!key) return this.toast.show('Could not create a key.');
      this.key.set(key);
      this.toast.show('New registration key created.');
    });
  }

  protected async disable(): Promise<void> {
    const t = this.tournament();
    if (!t || !confirm('Turn off the key? Anyone with the link will be able to register.')) return;
    await this.run(async () => {
      const ok = await this.tournaments.disableKey(t.id, this.auth.session());
      if (!ok) return this.toast.show('Could not turn off the key.');
      this.key.set('');
      this.toast.show('Registration key turned off.');
    });
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.changed.emit();
    } catch (err) {
      this.toast.show('Something went wrong - please try again.');
      console.error(err);
    } finally {
      this.busy.set(false);
    }
  }
}
