import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Tournament } from '../../core/models/models';
import { FirestoreService } from '../../core/services/firestore.service';
import { TournamentService } from '../../core/services/tournament.service';
import { withMeta } from '../../core/utils/tournament';
import { HomePage } from './home-page';

const make = (id: string, over: Record<string, unknown> = {}): Tournament =>
  withMeta(id, {
    title: 'Cup ' + id,
    game: 'Carrom',
    slots: 4,
    announcement: 'Big announcement',
    details: 'Rules here',
    prizeText: '',
    sponsor: 'ACME',
    startUTC: Date.now() + 3600_000,
    createdTZ: 'Asia/Kolkata',
    organizerId: 'o1',
    organizerName: 'Bella',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  });

describe('HomePage', () => {
  const list = vi.fn();

  beforeEach(() => {
    list.mockResolvedValue([
      make('live', { startUTC: Date.now() - 1000 }),
      make('soon', {
        teamSize: 2,
        registrations: [{ platoId: 'a', partnerPlatoId: 'b', registeredAt: 1 }],
      }),
      make('old', {
        startUTC: Date.now() - 99 * 3600_000,
        winners: [{ place: 1, name: 'Champ' }],
        closingMessage: 'GG',
      }),
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FirestoreService, useValue: { db: {} } },
        {
          provide: TournamentService,
          useValue: { list, myRegistrations: signal<string[]>(['live']) },
        },
      ],
    });
  });

  it('renders live and upcoming cards and toggles completed ones', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const cards = root.querySelectorAll('tf-tour-card');
    expect(cards.length).toBe(3);
    expect(root.textContent).toContain('🟢 LIVE NOW');
    expect(root.textContent).toContain('🕒 UPCOMING');
    expect(root.textContent).toContain('2v2');
    expect(root.textContent).toContain('1/2 teams');
    expect(root.textContent).toContain('You’re registered');
    expect(root.textContent).toContain('Sponsored by ACME');
    expect(root.textContent).toContain('Hide completed tournaments (1)');
    expect(root.querySelector('tf-winners-marquee')?.textContent).toContain('@Champ');
    expect(root.querySelector('tf-credit-line')?.textContent).toContain('Made with');
    expect(root.querySelector('tf-credit-line')?.textContent).not.toContain('Want to use');
    expect(root.querySelector('tf-contact-line')?.textContent).toContain(
      'Want to use TourneyForge for your own group? Contact Speedy on Plato (platoid: Speedy40) or on Discord (👾 speedy_speedy).',
    );

    expect(root.querySelectorAll('tf-tour-card').length).toBe(3);
    (root.querySelector('button[tfPill]') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelectorAll('tf-tour-card').length).toBe(2);
    (root.querySelector('button[tfPill]') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.textContent).toContain('Here are the winners!');
    expect(root.textContent).toContain('@Champ');
    expect(root.textContent).toContain('GG');
  });

  it('lists the latest completed tournament first and scrolls the winners', async () => {
    const done = (id: string, hoursAgo: number, winner: string) =>
      make(id, {
        startUTC: Date.now() - hoursAgo * 3600_000,
        winners: [{ place: 1, name: winner, prize: '2K coins' }],
      });
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([done('a', 200, 'Older'), done('b', 100, 'Newer')]),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const titles = Array.from(root.querySelectorAll('tf-tour-card')).map((c) => c.textContent);
    expect(titles[0]).toContain('Cup b');
    expect(titles[1]).toContain('Cup a');
    const marquee = root.querySelector('tf-winners-marquee') as HTMLElement;
    expect(marquee.querySelectorAll('.group').length).toBe(2);
    expect(marquee.querySelector('.item')?.textContent).toContain('Newer');
    expect(marquee.querySelector('.item')?.textContent).toContain('🎁 2K coins');
    expect(root.querySelector('tf-tour-card tf-podium')?.textContent).toContain('🎁 2K coins');
  });

  it('opens the detail modal from a card', async () => {
    const get = vi.fn().mockResolvedValue(make('soon'));
    TestBed.overrideProvider(TournamentService, {
      useValue: { list, get, myRegistrations: signal<string[]>([]) },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const view = Array.from(root.querySelectorAll('tf-tour-card button')).find((b) =>
      b.textContent?.includes('View details'),
    ) as HTMLElement;
    view.click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(get).toHaveBeenCalled();
    expect(root.querySelector('tf-modal [role="dialog"]')).not.toBeNull();
    expect(root.querySelector('tf-register-form')).not.toBeNull();
  });

  it('shows current matches to everyone and filters by Plato ID', async () => {
    const bracketed = make('soon', {
      forgeState: {
        members: ['Alice', 'Bob', 'Cara', 'Dan'],
        bracket: {
          thirdPlaceEnabled: true,
          stages: [
            {
              label: '2 Match',
              isThirdPlace: false,
              matches: [
                { p1Name: 'Alice', p2Name: 'Bob', winnerName: null },
                { p1Name: 'Cara', p2Name: 'Dan', winnerName: null },
              ],
            },
          ],
        },
      },
    });
    const get = vi.fn().mockResolvedValue(bracketed);
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([bracketed]),
        get,
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const button = Array.from(root.querySelectorAll('tf-tour-card button')).find((b) =>
      b.textContent?.includes('Current matches'),
    ) as HTMLElement;
    button.click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(root.querySelectorAll('tf-matches-modal .match').length).toBe(2);

    const search = root.querySelector('#matchSearch') as HTMLInputElement;
    search.value = 'cara';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const visible = root.querySelectorAll('tf-matches-modal .match');
    expect(visible.length).toBe(1);
    expect(visible[0].textContent).toContain('@Cara');

    search.value = 'nobody';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.textContent).toContain('No current match found');
  });

  it('shows the animated guide when there are no live or upcoming tournaments', async () => {
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([make('old', { startUTC: Date.now() - 99 * 3600_000 })]),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    expect(root.textContent).toContain('No live or upcoming tournaments right now');
    const guide = root.querySelector('tf-how-it-works');
    expect(guide).not.toBeNull();
    expect(guide?.querySelectorAll('svg .scene').length).toBe(4);
    expect(guide?.querySelectorAll('.caption').length).toBe(4);
    expect(guide?.textContent).toContain('Enter your Plato ID');
  });

  it('hides Current matches once a tournament is completed', async () => {
    const forgeState = {
      members: ['Alice', 'Bob'],
      bracket: {
        thirdPlaceEnabled: false,
        stages: [
          {
            label: 'Final Match',
            isThirdPlace: false,
            matches: [{ p1Name: 'Alice', p2Name: 'Bob', winnerName: 'Alice' }],
          },
        ],
      },
    };
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi
          .fn()
          .mockResolvedValue([
            make('live', { forgeState }),
            make('done', { forgeState, completed: true }),
          ]),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const cards = Array.from(root.querySelectorAll('tf-tour-card'));
    expect(cards.length).toBe(2);
    const withButton = cards.filter((c) => c.textContent?.includes('Current matches'));
    expect(withButton.length).toBe(1);
    expect(withButton[0].textContent).toContain('Cup live');
  });

  it('shows coming soon instead of Register until registration opens', async () => {
    const opensAt = Date.now() + 2 * 3600_000 + 60_000;
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([make('later', { registrationOpensAt: opensAt })]),
        get: vi.fn().mockResolvedValue(make('later', { registrationOpensAt: opensAt })),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const card = root.querySelector('tf-tour-card') as HTMLElement;
    expect(card.textContent).toContain('Registration coming soon');
    expect(card.textContent).toContain('opens in 2h');
    expect(card.textContent).toContain('Registration opens');
    expect(
      Array.from(card.querySelectorAll('button')).some((b) => b.textContent?.includes('Register')),
    ).toBe(false);

    const view = Array.from(card.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('View details'),
    ) as HTMLElement;
    view.click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(root.querySelector('tf-modal')?.textContent).toContain('Registration coming soon');
    expect(root.querySelector('tf-register-form')).toBeNull();
  });

  it('shows the Register button once registration has opened', async () => {
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi
          .fn()
          .mockResolvedValue([make('open', { registrationOpensAt: Date.now() - 60_000 })]),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const card = root.querySelector('tf-tour-card') as HTMLElement;
    expect(card.textContent).not.toContain('coming soon');
    expect(
      Array.from(card.querySelectorAll('button')).some((b) => b.textContent?.includes('Register')),
    ).toBe(true);
  });

  it('shows Registration closed instead of Register when staff close registration', async () => {
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([make('shut', { registrationClosed: true })]),
        get: vi.fn().mockResolvedValue(make('shut', { registrationClosed: true })),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const card = root.querySelector('tf-tour-card') as HTMLElement;
    expect(card.textContent).toContain('Registration closed');
    const labels = Array.from(card.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels.some((l) => l?.includes('Register'))).toBe(false);

    (
      Array.from(card.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('View details'),
      ) as HTMLElement
    ).click();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(root.querySelector('tf-modal')?.textContent).toContain('Registration is closed');
    expect(root.querySelector('tf-register-form')).toBeNull();
  });

  it('opens a how-to slideshow with the registration steps and demo names', async () => {
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    expect(root.querySelector('tf-slideshow')).toBeNull();

    const open = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('How to use'),
    ) as HTMLElement;
    open.click();
    await fixture.whenStable();
    const modal = root.querySelector('tf-how-to-modal') as HTMLElement;
    expect(modal.textContent).toContain('Create a tournament');
    expect(modal.textContent).toContain('Demo Cup');

    (modal.querySelector('[aria-label="Go to slide 2"]') as HTMLElement).click();
    await fixture.whenStable();
    const text = modal.textContent ?? '';
    expect(text).toContain('Registration soon');
    expect(text).toContain('Register');
    expect(text).toContain('Slots full');

    (modal.querySelector('[aria-label="Go to slide 3"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(modal.textContent).toContain('Aiden');

    (modal.querySelector('[aria-label="Close"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelector('tf-slideshow')).toBeNull();
  });

  it('shows coming soon without a countdown when staff set it manually', async () => {
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([make('manual', { registrationSoon: true })]),
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const card = root.querySelector('tf-tour-card') as HTMLElement;
    const text = (card.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Registration coming soon');
    expect(text).not.toContain('opens in');
    expect(text).not.toContain('Registration opens');
    const labels = Array.from(card.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels.some((l) => l?.includes('Register'))).toBe(false);
  });
});
