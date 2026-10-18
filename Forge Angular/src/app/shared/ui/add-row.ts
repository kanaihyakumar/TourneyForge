import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { Button } from './button';
import { Input } from '../forms/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'tf-add-row',
  imports: [Button, Input, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-input
      #field
      [(ngModel)]="text"
      [ngModelOptions]="{ standalone: true }"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      autocomplete="off"
      (keydown.enter)="$event.preventDefault(); submit()"
    />
    <button type="button" tfButton [variant]="primary() ? 'primary' : 'default'" (click)="submit()">
      {{ buttonLabel() }}
    </button>
  `,
  styles: `
    :host {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    tf-input {
      flex: 1 1 220px;
    }
  `,
})
export class AddRow {
  readonly placeholder = input('');
  readonly buttonLabel = input('+ Add');
  readonly ariaLabel = input('');
  readonly primary = input(false, { transform: booleanAttribute });
  readonly validate = input<(value: string) => string | null>(() => null);
  readonly added = output<string>();

  protected readonly text = signal('');
  private readonly toast = inject(ToastService);
  private readonly field = viewChild.required<Input>('field');

  protected submit(): void {
    const value = this.text().trim();
    if (!value) return;
    const error = this.validate()(value);
    if (error) {
      this.toast.show(error);
      return;
    }
    this.added.emit(value);
    this.text.set('');
    this.field().focus();
  }
}
