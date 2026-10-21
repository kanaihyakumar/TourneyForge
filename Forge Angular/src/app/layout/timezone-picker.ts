import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimezoneService } from '../core/services/timezone.service';
import { Select } from '../shared/forms/select';

@Component({
  selector: 'tf-timezone-picker',
  imports: [FormsModule, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label for="tzSelect" title="Show times in">🕒</label>
    <tf-select
      inputId="tzSelect"
      compact
      [options]="timezone.options()"
      [ngModel]="timezone.selected()"
      (ngModelChange)="timezone.select($event)"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    @media (max-width: 480px) {
      label {
        display: none;
      }
    }

    label {
      margin: 0;
      font-size: 1rem;
      cursor: help;
    }
  `,
})
export class TimezonePicker {
  protected readonly timezone = inject(TimezoneService);
}
