import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Session, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { OrganizerService } from '../../core/services/organizer.service';
import { TournamentService } from '../../core/services/tournament.service';
import { withMeta } from '../../core/utils/tournament';
import { UsageService } from '../../core/services/usage.service';
import { DashboardPage } from './dashboard-page';

const tournament = (): Tournament =>
  withMeta('t1', {
    title: 'Carrom Cup',
    game: 'Carrom',
    slots: 32,
    teamSize: 2,
    announcement: 'Hype',
    details: '',
    prizeText: '',
    sponsor: '',
    hosts: ['Host1'],
    winners: [{ place: 1, name: 'Champ' }],
    managerIds: ['o2'],
    startUTC: Date.UTC(2026, 0, 15, 4, 30),
    createdTZ: 'Asia/Kolkata',
    organizerId: 'admin',
    organizerName: 'Admin',
    createdAt: 0,
    updatedAt: 0,
  });

describe('DashboardPage', () => {
  const session: Session = { role: 'admin', id: 'admin', displayName: 'Admin' };
  const update = vi.fn();
  const get = vi.fn();
  const create = vi.fn();

  beforeEach(() => {
    update.mockReset().mockResolvedValue(tournament());
    get.mockReset().mockResolvedValue(tournament());
    create.mockReset().mockResolvedValue(tournament());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FirestoreService, useValue: { db: {} } },
        {
          provide: AuthService,
          useValue: {
            session: signal<Session | null>(session),
            isAdmin: signal(true),
            canViewOrganizers: signal(true),
            openLogin: vi.fn(),
          },
        },
        {
          provide: UsageService,
          useValue: {
            days: signal({}),
            loaded: signal(true),
            error: signal(false),
            today: () => ({ reads: 0, writes: 0, deletes: 0 }),
            worstLevel: () => 'ok',
            load: () => Promise.resolve(),
            flush: () => Promise.resolve(),
          },
        },
        {
          provide: TournamentService,
          useValue: { list: () => Promise.resolve([tournament()]), get, update, create },
        },
        {
          provide: OrganizerService,
          useValue: {
            list: () =>
              Promise.resolve([
                {
                  id: 'o2',
                  username: 'bella',
                  usernameLower: 'bella',
                  password: 'x',
                  displayName: 'Bella',
                  canManageOrganizers: false,
                  createdAt: 0,
                },
              ]),
          },
        },
      ],
    });
  });

  const settle = async (fixture: ReturnType<typeof TestBed.createComponent>) => {
    for (let i = 0; i < 4; i++) await fixture.whenStable();
  };

  it('lists tournaments and organizers for an admin', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    expect(root.textContent).toContain('Carrom Cup');
    expect(root.textContent).toContain('co-managed by Bella');
    expect(root.textContent).toContain('hosted by Admin');
    expect(root.querySelectorAll('tf-tabs button').length).toBe(3);
    expect(root.textContent).toContain('@bella');
  });

  it('loads a tournament into the form for editing and saves it', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const edit = Array.from(root.querySelectorAll('tf-tournament-list button')).find((b) =>
      b.textContent?.includes('Edit'),
    ) as HTMLElement;
    edit.click();
    await settle(fixture);

    const value = (id: string) => (root.querySelector('#' + id) as HTMLInputElement).value;
    expect(value('tf_title')).toBe('Carrom Cup');
    expect(value('tf_date')).toBe('2026-01-15');
    expect(value('tf_time')).toBe('10:00');
    expect(value('tf_winner1')).toBe('Champ');
    expect(root.querySelector('tf-tournament-form tf-chip-list')?.textContent).toContain('Host1');
    expect(root.querySelector('tf-tournament-form .field-note')?.textContent).toContain('16 teams');

    const form = root.querySelector('tf-tournament-form form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await settle(fixture);

    expect(update).toHaveBeenCalledTimes(1);
    const [id, payload] = update.mock.calls[0];
    expect(id).toBe('t1');
    expect(payload).toMatchObject({
      title: 'Carrom Cup',
      slots: '32',
      teamSize: 2,
      format: '2v2',
      playersPerMatch: 2,
      startUTC: Date.UTC(2026, 0, 15, 4, 30),
      createdTZ: 'Asia/Kolkata',
      hosts: ['Host1'],
      managerIds: ['o2'],
      winners: [{ place: 1, name: 'Champ' }],
    });
    expect(value('tf_title')).toBe('');
  });

  it('shows organizers an admin assigned to the tournament, locked, to a non-admin editor', async () => {
    TestBed.overrideProvider(AuthService, {
      useValue: {
        session: signal<Session | null>({
          role: 'organizer',
          id: 'o2',
          displayName: 'Bella',
          canManageOrganizers: true,
        }),
        isAdmin: signal(false),
        canViewOrganizers: signal(true),
        openLogin: vi.fn(),
      },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const edit = Array.from(root.querySelectorAll('tf-tournament-list button')).find((b) =>
      b.textContent?.includes('Edit'),
    ) as HTMLElement;
    edit.click();
    await settle(fixture);

    const boxes = root.querySelectorAll('tf-tournament-form tf-checkbox');
    expect(boxes.length).toBe(1);
    expect(boxes[0].textContent).toContain('Bella');
    expect((boxes[0].querySelector('input') as HTMLInputElement).checked).toBe(true);
    expect((boxes[0].querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows Current matches only for tournaments that are not completed', async () => {
    const forgeState = {
      members: ['Alice', 'Bob'],
      bracket: {
        thirdPlaceEnabled: false,
        stages: [
          {
            label: 'Final Match',
            isThirdPlace: false,
            matches: [{ p1Name: 'Alice', p2Name: 'Bob', winnerName: null }],
          },
        ],
      },
    };
    const live = {
      ...tournament(),
      status: 'upcoming' as const,
      id: 'live',
      title: 'Live Cup',
      startUTC: Date.now() + 3600_000,
      forgeState,
    };
    const done = {
      ...live,
      id: 'done',
      title: 'Done Cup',
      completed: true,
      status: 'completed' as const,
    };
    TestBed.overrideProvider(TournamentService, {
      useValue: { list: () => Promise.resolve([live, done]), get, update, create },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const rows = Array.from(root.querySelectorAll('tf-tournament-list tf-list-row'));
    expect(rows.length).toBe(2);
    const row = (title: string) => rows.find((r) => r.textContent?.includes(title))!;
    expect(row('Live Cup').textContent).toContain('Current matches');
    expect(row('Done Cup').textContent).not.toContain('Current matches');
  });
});
