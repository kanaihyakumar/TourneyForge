import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PASSWORD_DEFAULT_LENGTH,
  PASSWORD_KEYWORD,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../core/config/constants';
import { generatePasswords } from '../../core/utils/password';
import { Button } from '../ui/button';
import { ChunkCopy } from '../ui/chunk-copy';
import { Select } from './select';

@Component({
  selector: 'tf-password-generator',
  imports: [FormsModule, Select, Button, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <strong>🎲 Suggested passwords</strong>
      <div class="controls">
        <tf-select
          [inputId]="idPrefix() + 'Length'"
          compact
          [options]="lengthOptions"
          [ngModel]="length()"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="setLength($event)"
        />
        <button type="button" tfButton size="sm" (click)="regenerate()">🔄 Generate more</button>
      </div>
    </div>
    <div class="options" role="listbox" aria-label="Suggested passwords">
      @for (option of options(); track option) {
        <button
          type="button"
          class="option"
          role="option"
          [class.on]="option === value()"
          [attr.aria-selected]="option === value()"
          (click)="picked.emit(option)"
        >
          {{ option }}
        </button>
      }
    </div>
    <div class="foot">
      <span class="note">
        Tap one to use it, or type your own above. Suggestions always contain “{{ keyword }}” and
        are {{ length() }} characters.
      </span>
      @if (value()) {
        <tf-chunk-copy [chunks]="[value()]" label="Copy password" />
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      @include neu-well(3px);
      padding: 12px 14px;
    }

    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.86rem;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .option {
      @include reset-button;
      @include neu-surface(3px, var(--radius-pill));
      padding: 7px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.86rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      color: var(--text);
    }

    .option.on {
      @include neu-inset(3px);
      color: var(--accent-dark);
    }

    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .note {
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-soft);
    }
  `,
})
export class PasswordGenerator {
  readonly value = input('');
  readonly idPrefix = input('pwGen');
  readonly picked = output<string>();

  protected readonly keyword = PASSWORD_KEYWORD;
  protected readonly lengthOptions = Array.from(
    { length: PASSWORD_MAX_LENGTH - PASSWORD_MIN_LENGTH + 1 },
    (_, i) => {
      const n = PASSWORD_MIN_LENGTH + i;
      return { value: String(n), label: `${n} characters` };
    },
  );
  protected readonly length = signal(String(PASSWORD_DEFAULT_LENGTH));
  protected readonly options = signal<string[]>(generatePasswords(PASSWORD_DEFAULT_LENGTH));

  protected setLength(value: string): void {
    this.length.set(String(value));
    this.regenerate();
  }

  protected regenerate(): void {
    this.options.set(generatePasswords(Number(this.length())));
  }
}
