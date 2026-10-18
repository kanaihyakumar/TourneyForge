import { inject, Injectable, signal } from '@angular/core';
import { DEFAULT_TIMEZONE, STORAGE_KEYS } from '../config/constants';
import { formatWithZone } from '../utils/time';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  private readonly storage = inject(StorageService);

  readonly selected = signal(
    this.storage.getString(STORAGE_KEYS.displayTimezone) || DEFAULT_TIMEZONE,
  );

  select(id: string): void {
    this.selected.set(id);
    this.storage.setString(STORAGE_KEYS.displayTimezone, id);
  }

  format(utcMillis: number): string {
    return formatWithZone(utcMillis, this.selected());
  }
}
