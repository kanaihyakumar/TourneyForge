import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <tf-page-header subtitle="Tagline">
      <button type="button" class="action">Logout</button>
      <label class="field">Zone <input class="zone" /></label>
    </tf-page-header>
  `,
})
class Host {}

describe('PageHeader', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('tf-page-header') as HTMLElement;
    const menu = root.querySelector('.menu') as HTMLButtonElement;
    return { fixture, root, header, menu };
  };

  it('keeps the actions inside a menu that starts closed', async () => {
    const { header, menu, root } = await setup();
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-label')).toBe('Open menu');
    expect(header.classList.contains('open')).toBe(false);
    expect(root.querySelector('.actions .action')).not.toBeNull();
    expect(root.querySelector('.actions')?.id).toBe(menu.getAttribute('aria-controls'));
  });

  it('opens and closes from the hamburger button', async () => {
    const { fixture, header, menu } = await setup();
    menu.click();
    await fixture.whenStable();
    expect(header.classList.contains('open')).toBe(true);
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    expect(menu.textContent?.trim()).toBe('✕');
    menu.click();
    await fixture.whenStable();
    expect(header.classList.contains('open')).toBe(false);
    expect(menu.textContent?.trim()).toBe('☰');
  });

  it('closes after choosing an action but stays open while using a field', async () => {
    const { fixture, root, header, menu } = await setup();
    menu.click();
    await fixture.whenStable();
    (root.querySelector('.zone') as HTMLElement).click();
    await fixture.whenStable();
    expect(header.classList.contains('open')).toBe(true);
    (root.querySelector('.action') as HTMLElement).click();
    await fixture.whenStable();
    expect(header.classList.contains('open')).toBe(false);
  });

  it('closes with the Escape key', async () => {
    const { fixture, header, menu } = await setup();
    menu.click();
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(header.classList.contains('open')).toBe(false);
  });
});
