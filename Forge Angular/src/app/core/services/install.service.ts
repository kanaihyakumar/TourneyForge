import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { INSTALL_PROMO_SNOOZE_MS, STORAGE_KEYS } from '../config/constants';
import { StorageService } from './storage.service';

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'ios' | 'android' | 'desktop';
export type InstallOutcome = 'accepted' | 'dismissed' | 'guide';

export function detectPlatform(
  userAgent: string,
  platform: string,
  touchPoints: number,
): InstallPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) {
    return 'ios';
  }
  return /android/i.test(userAgent) ? 'android' : 'desktop';
}

export function isStandaloneDisplay(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    navigatorWithStandalone.standalone === true ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
  );
}

@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly storage = inject(StorageService);

  readonly platform = detectPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
  readonly guideOpen = signal(false);
  readonly installed = signal(isStandaloneDisplay());
  readonly nativePrompt = signal<InstallPromptEvent | null>(null);
  readonly available = computed(() => !this.installed());
  readonly promoVisible = computed(() => this.available() && !this.snoozed());
  private readonly snoozed = signal(this.readSnooze());

  constructor() {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      this.nativePrompt.set(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      this.installed.set(true);
      this.nativePrompt.set(null);
      this.guideOpen.set(false);
    };
    const display =
      typeof matchMedia === 'function' ? matchMedia('(display-mode: standalone)') : null;
    const onDisplay = () => this.installed.set(isStandaloneDisplay());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    display?.addEventListener?.('change', onDisplay);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      display?.removeEventListener?.('change', onDisplay);
    });
  }

  openGuide(): void {
    this.guideOpen.set(true);
  }

  async start(): Promise<InstallOutcome> {
    const prompt = this.nativePrompt();
    if (!prompt) {
      this.guideOpen.set(true);
      return 'guide';
    }
    this.nativePrompt.set(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') this.installed.set(true);
      return choice.outcome;
    } catch {
      this.guideOpen.set(true);
      return 'guide';
    }
  }

  snoozePromo(): void {
    this.storage.setString(
      STORAGE_KEYS.installSnoozedUntil,
      String(Date.now() + INSTALL_PROMO_SNOOZE_MS),
    );
    this.snoozed.set(true);
  }

  private readSnooze(): boolean {
    return Number(this.storage.getString(STORAGE_KEYS.installSnoozedUntil)) > Date.now();
  }
}
