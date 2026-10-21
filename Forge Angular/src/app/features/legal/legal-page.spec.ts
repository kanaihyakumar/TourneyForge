import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { LEGAL_DOCS } from '../../core/config/legal';
import { SiteFooter } from '../../layout/site-footer';

describe('Legal pages', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('serves privacy, terms, disclaimer and contact pages', async () => {
    const harness = await RouterTestingHarness.create();
    for (const doc of LEGAL_DOCS) {
      await harness.navigateByUrl('/' + doc.id);
      const text = (harness.routeNativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain(doc.title);
      expect(text).toContain(doc.sections[0].heading);
    }
    await harness.navigateByUrl('/contact');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Speedy40');
  });

  it('links to every page from the footer', async () => {
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/privacy',
      '/terms',
      '/disclaimer',
      '/contact',
    ]);
  });
});
