import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from '../app';
import { InstallService } from '../core/services/install.service';
import { InstallApp } from './install-app';
import { SiteFooter } from './site-footer';

describe('Install the app', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ');

  it('shows a promo card with the pitch and a button that opens the guide', async () => {
    const fixture = TestBed.createComponent(InstallApp);
    fixture.componentRef.setInput('variant', 'card');
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    const card = root.querySelector('.card') as HTMLElement;
    expect(text(card)).toContain('Get the TourneyForge app');
    expect(text(card)).toContain('no more typing the website link');
    const service = TestBed.inject(InstallService);
    expect(service.guideOpen()).toBe(false);
    (card.querySelector('button') as HTMLElement).click();
    await fixture.whenStable();
    expect(service.guideOpen()).toBe(true);
  });

  it('hides the promo card on "Not now", and when the app is already installed', async () => {
    const fixture = TestBed.createComponent(InstallApp);
    fixture.componentRef.setInput('variant', 'card');
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    (root.querySelector('.later') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelector('.card')).toBeNull();
    fixture.destroy();

    const button = TestBed.createComponent(InstallApp);
    await button.whenStable();
    expect((button.nativeElement as HTMLElement).querySelector('button')?.textContent).toContain(
      'Get the app',
    );
    TestBed.inject(InstallService).installed.set(true);
    await button.whenStable();
    expect((button.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });

  it('puts a Get the app link in the footer next to the legal links', async () => {
    const fixture = TestBed.createComponent(SiteFooter);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const labels = Array.from(root.querySelectorAll('nav a, nav button')).map((e) =>
      e.textContent?.trim(),
    );
    expect(labels).toEqual([
      'Privacy Policy',
      'Terms of Use',
      'Disclaimer',
      'Contact',
      '📲 Get the app',
    ]);
    (root.querySelector('.get-app') as HTMLElement).click();
    await fixture.whenStable();
    expect(TestBed.inject(InstallService).guideOpen()).toBe(true);

    TestBed.inject(InstallService).installed.set(true);
    await fixture.whenStable();
    expect(root.querySelector('.get-app')).toBeNull();
  });

  it('shows the iPhone and Android steps in the guide, starting with the right one', async () => {
    const fixture = TestBed.createComponent(App);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const service = TestBed.inject(InstallService);
    service.openGuide();
    await fixture.whenStable();

    const modal = root.querySelector('tf-install-modal') as HTMLElement;
    expect(text(modal)).toContain('Skip typing the website link');
    expect(text(modal)).toContain('Opens full screen');
    const tabs = Array.from(modal.querySelectorAll('tf-tabs button'));
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(['🍎 iPhone / iPad', '🤖 Android']);
    expect(text(modal)).toContain('Install app');

    (tabs[0] as HTMLElement).click();
    await fixture.whenStable();
    expect(text(modal)).toContain('Add to Home Screen');
    expect(text(modal)).toContain('Share button');
    expect(text(modal)).toContain('open this page in Safari');
    expect(modal.querySelector('button.primary')).toBeNull();

    (tabs[1] as HTMLElement).click();
    await fixture.whenStable();
    expect(text(modal)).toContain('⋮ menu');
  });

  it('offers a one-tap install button in the guide when the browser supports it', async () => {
    const fixture = TestBed.createComponent(App);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const service = TestBed.inject(InstallService);
    const prompt = vi.fn().mockResolvedValue(undefined);
    service.nativePrompt.set({
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    } as never);
    service.openGuide();
    await fixture.whenStable();

    const modal = root.querySelector('tf-install-modal') as HTMLElement;
    const install = Array.from(modal.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Install the app'),
    ) as HTMLElement;
    expect(install).toBeDefined();
    expect(modal.querySelector('tf-tabs')).toBeNull();
    install.click();
    await fixture.whenStable();
    expect(prompt).toHaveBeenCalled();
    expect(service.guideOpen()).toBe(false);
  });
});
