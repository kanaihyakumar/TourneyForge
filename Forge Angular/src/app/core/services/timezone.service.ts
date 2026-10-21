import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { CLOCK_TICK_MS, DEFAULT_TIMEZONE, STORAGE_KEYS } from '../config/constants';
import { formatWithZone, timezoneOptionsAt } from '../utils/time';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TimezoneService {
  private readonly storage = inject(StorageService);

  readonly selected = signal(
    this.storage.getString(STORAGE_KEYS.displayTimezone) || DEFAULT_TIMEZONE,
  );

  readonly now = signal(Date.now());
  readonly options = computed(() => timezoneOptionsAt(this.now()));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  select(id: string): void {
    this.selected.set(id);
    this.storage.setString(STORAGE_KEYS.displayTimezone, id);
  }

  format(utcMillis: number): string {
    return formatWithZone(utcMillis, this.selected());
  }
}
