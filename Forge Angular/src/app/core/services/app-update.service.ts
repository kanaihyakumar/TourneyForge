import { inject, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { UPDATE_CHECK_MIN_GAP_MS } from '../config/constants';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly toast = inject(ToastService);
  private lastCheck = 0;

  constructor() {
    if (!this.updates?.isEnabled) return;
    this.updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.toast.show('A new version of TourneyForge is ready - reload to get it.', 'accent');
      }
    });
    const check = () => {
      const now = Date.now();
      if (
        document.visibilityState !== 'visible' ||
        now - this.lastCheck < UPDATE_CHECK_MIN_GAP_MS
      ) {
        return;
      }
      this.lastCheck = now;
      void this.updates?.checkForUpdate().catch(() => false);
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
  }
}
