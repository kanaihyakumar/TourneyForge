import { Injectable, signal } from '@angular/core';

export type ToastTone = 'dark' | 'accent';

const TOAST_DURATION_MS = 2400;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');
  readonly visible = signal(false);
  readonly tone = signal<ToastTone>('dark');
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, tone: ToastTone = 'dark'): void {
    this.message.set(message);
    this.tone.set(tone);
    this.visible.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), TOAST_DURATION_MS);
  }
}
