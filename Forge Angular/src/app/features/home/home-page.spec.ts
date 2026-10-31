import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEW_GAMES } from '../../core/config/new-games';
import { Session, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
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
    expect(root.querySelector('tf-credit-line')?.textContent).toContain(
      'send Speedy an ✨ aura or a 🎁 gift on Plato',
    );
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
    const track = marquee.querySelector('.track') as HTMLElement;
    expect(parseFloat(track.style.animationDuration)).toBeGreaterThanOrEqual(40);
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

  it('shows the How to use button only to a logged in admin or organizer', async () => {
    const session = signal<Session | null>(null);
    TestBed.overrideProvider(AuthService, {
      useValue: {
        session,
        isAdmin: signal(false),
        canViewOrganizers: signal(false),
        openLogin: vi.fn(),
        logout: vi.fn(),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const howTo = () =>
      Array.from(root.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('How to use'),
      );
    expect(howTo()).toBeUndefined();

    session.set({ role: 'organizer', id: 'o1', displayName: 'Bella' });
    await fixture.whenStable();
    expect(howTo()).toBeDefined();
    howTo()?.click();
    await fixture.whenStable();
    expect(root.querySelector('tf-how-to-modal')?.textContent).toContain('Create a tournament');

    session.set(null);
    await fixture.whenStable();
    expect(howTo()).toBeUndefined();
    expect(root.querySelector('tf-how-to-modal')).toBeNull();
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

  it('asks for the registration key and sends it with the Plato ID', async () => {
    const keyed = make('keyed', { keyRequired: true });
    const register = vi.fn().mockResolvedValue({ ok: true, message: 'Registered!' });
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([keyed]),
        get: vi.fn().mockResolvedValue(keyed),
        register,
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    expect(root.querySelector('tf-tour-card')?.textContent).toContain('Key required');

    (
      Array.from(root.querySelectorAll('tf-tour-card button')).find((b) =>
        b.textContent?.includes('View details'),
      ) as HTMLElement
    ).click();
    await fixture.whenStable();
    await fixture.whenStable();

    const set = (id: string, value: string) => {
      const el = root.querySelector('#' + id) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    expect(root.querySelector('tf-register-form')?.textContent).toContain('Registration key');
    set('platoIdInput', 'Fay');
    set('regKeyInput', '76258');
    (root.querySelector('tf-register-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    expect(register).toHaveBeenCalledWith('keyed', 'Fay', undefined, null, '76258');
  });

  it('shows a wrong key message and does not ask for a key when none is needed', async () => {
    const keyed = make('keyed', { keyRequired: true });
    const register = vi
      .fn()
      .mockResolvedValue({ ok: false, message: 'That registration key is not correct.' });
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([keyed]),
        get: vi.fn().mockResolvedValue(keyed),
        register,
        myRegistrations: signal<string[]>([]),
      },
    });
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    (
      Array.from(root.querySelectorAll('tf-tour-card button')).find((b) =>
        b.textContent?.includes('View details'),
      ) as HTMLElement
    ).click();
    await fixture.whenStable();
    await fixture.whenStable();
    (root.querySelector('#platoIdInput') as HTMLInputElement).value = 'Fay';
    (root.querySelector('#platoIdInput') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('#regKeyInput') as HTMLInputElement).value = '1';
    (root.querySelector('#regKeyInput') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('tf-register-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    expect(root.querySelector('tf-register-form')?.textContent).toContain('not correct');
  });

  it('does not ask for a key when the tournament has none', async () => {
    const open = make('open');
    TestBed.overrideProvider(TournamentService, {
      useValue: {
        list: vi.fn().mockResolvedValue([open]),
        get: vi.fn().mockResolvedValue(open),
        register: vi.fn(),
        myRegistrations: signal<string[]>([]),
      },
    });
    const plain = TestBed.createComponent(HomePage);
    const plainRoot = plain.nativeElement as HTMLElement;
    await plain.whenStable();
    await plain.whenStable();
    expect(plainRoot.querySelector('tf-tour-card')?.textContent).not.toContain('Key required');
    (
      Array.from(plainRoot.querySelectorAll('tf-tour-card button')).find((b) =>
        b.textContent?.includes('View details'),
      ) as HTMLElement
    ).click();
    await plain.whenStable();
    await plain.whenStable();
    expect(plainRoot.querySelector('#regKeyInput')).toBeNull();
  });

  it('shows the Get the app card on the home page, and removes it once installed', async () => {
    localStorage.removeItem('tf_install_snoozed_until');
    const fixture = TestBed.createComponent(HomePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const card = root.querySelector('tf-install-app .card') as HTMLElement;
    expect(card.textContent).toContain('Get the TourneyForge app');
    expect(card.textContent).toContain('no more typing the website link');
    expect(card.querySelector('button')?.textContent).toContain('Get the app');
  });

  it('shows no new game banner when nothing was added recently', async () => {
    localStorage.removeItem('tf_seen_new_games_v1');
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('tf-new-games-banner')?.textContent,
    ).not.toContain('New game added');
  });

  it('announces a newly added game once, until the visitor dismisses it', async () => {
    localStorage.removeItem('tf_seen_new_games_v1');
    NEW_GAMES.push({ name: 'Bubble Bay', addedOn: '2026-10-29', tagline: 'Now ready.' });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-01'));
    try {
      const fixture = TestBed.createComponent(HomePage);
      const root = fixture.nativeElement as HTMLElement;
      await fixture.whenStable();
      const banner = root.querySelector('tf-new-games-banner') as HTMLElement;
      expect(banner.textContent).toContain('New game added');
      expect(banner.textContent).toContain('Bubble Bay');
      (banner.querySelector('button') as HTMLElement).click();
      await fixture.whenStable();
      expect(banner.textContent).not.toContain('Bubble Bay');
      expect(localStorage.getItem('tf_seen_new_games_v1')).toContain('Bubble Bay');
    } finally {
      NEW_GAMES.pop();
      clock.mockRestore();
      localStorage.removeItem('tf_seen_new_games_v1');
    }
  });
});
