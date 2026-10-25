import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../config/constants';
import { detectPlatform, InstallPromptEvent, InstallService } from './install.service';

const fakePrompt = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent;
  const prompt = vi.fn().mockResolvedValue(undefined);
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome }) });
  return { event, prompt };
};

describe('InstallService', () => {
  beforeEach(() => localStorage.clear());

  const create = () => TestBed.inject(InstallService);

  it('tells iPhone, iPad, Android and desktop apart', () => {
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
    const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile';
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605';
    expect(detectPlatform(iphone, 'iPhone', 5)).toBe('ios');
    expect(detectPlatform(mac, 'MacIntel', 5)).toBe('ios');
    expect(detectPlatform(android, 'Linux armv8l', 5)).toBe('android');
    expect(detectPlatform(mac, 'MacIntel', 0)).toBe('desktop');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)).toBe('desktop');
  });

  it('keeps the browser install prompt for later instead of showing it straight away', () => {
    const service = create();
    expect(service.nativePrompt()).toBeNull();
    const { event } = fakePrompt();
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(service.nativePrompt()).toBe(event);
  });

  it('shows the real install prompt when the browser offers one', async () => {
    const service = create();
    const { event, prompt } = fakePrompt('accepted');
    window.dispatchEvent(event);

    expect(await service.start()).toBe('accepted');
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(service.guideOpen()).toBe(false);
    expect(service.installed()).toBe(true);
    expect(service.available()).toBe(false);
    expect(service.nativePrompt()).toBeNull();
  });

  it('keeps the app available when the visitor declines the prompt', async () => {
    const service = create();
    window.dispatchEvent(fakePrompt('dismissed').event);
    expect(await service.start()).toBe('dismissed');
    expect(service.installed()).toBe(false);
    expect(service.available()).toBe(true);
  });

  it('opens the step-by-step guide when there is no browser prompt, like on an iPhone', async () => {
    const service = create();
    expect(service.guideOpen()).toBe(false);
    expect(await service.start()).toBe('guide');
    expect(service.guideOpen()).toBe(true);
  });

  it('falls back to the guide if the prompt fails', async () => {
    const service = create();
    const { event } = fakePrompt();
    Object.assign(event, { prompt: vi.fn().mockRejectedValue(new Error('blocked')) });
    window.dispatchEvent(event);
    expect(await service.start()).toBe('guide');
    expect(service.guideOpen()).toBe(true);
  });

  it('hides everything once the app has been installed', () => {
    const service = create();
    window.dispatchEvent(fakePrompt().event);
    service.openGuide();
    expect(service.available()).toBe(true);

    window.dispatchEvent(new Event('appinstalled'));
    expect(service.installed()).toBe(true);
    expect(service.available()).toBe(false);
    expect(service.promoVisible()).toBe(false);
    expect(service.guideOpen()).toBe(false);
    expect(service.nativePrompt()).toBeNull();
  });

  it('hides the home card for a week after "Not now", but keeps the button', () => {
    const service = create();
    expect(service.promoVisible()).toBe(true);
    service.snoozePromo();
    expect(service.promoVisible()).toBe(false);
    expect(service.available()).toBe(true);

    const until = Number(localStorage.getItem(STORAGE_KEYS.installSnoozedUntil));
    expect(until).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);
    expect(until).toBeLessThanOrEqual(Date.now() + 7 * 24 * 3600 * 1000);
  });

  it('remembers the snooze next time, and shows the card again after it ends', () => {
    localStorage.setItem(STORAGE_KEYS.installSnoozedUntil, String(Date.now() + 60_000));
    expect(create().promoVisible()).toBe(false);

    TestBed.resetTestingModule();
    localStorage.setItem(STORAGE_KEYS.installSnoozedUntil, String(Date.now() - 1000));
    expect(TestBed.inject(InstallService).promoVisible()).toBe(true);
  });
});
