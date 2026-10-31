import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirestoreService } from '../../core/services/firestore.service';
import { TournamentService } from '../../core/services/tournament.service';
import { withMeta } from '../../core/utils/tournament';
import { HostPage } from './host-page';

const make = (id: string, over: Record<string, unknown> = {}) =>
  withMeta(id, {
    title: 'Cup ' + id,
    game: 'Carrom',
    slots: 8,
    announcement: '',
    details: '',
    prizeText: '',
    sponsor: '',
    startUTC: Date.now() + 3600_000,
    createdTZ: 'UTC',
    organizerId: 'o1',
    organizerName: 'Bella',
    keyRequired: true,
    registrations: ['a', 'b', 'c', 'd'].map((platoId) => ({ platoId, registeredAt: 1 })),
    createdAt: 0,
    updatedAt: 0,
    ...over,
  });

describe('HostPage', () => {
  const saveForgeState = vi.fn().mockResolvedValue(true);
  const getKey = vi.fn().mockResolvedValue('76258');
  let fixture: ComponentFixture<unknown>;
  let all = [make('t1'), make('t2', { organizerId: 'other' })];

  const loginAs = (role: 'admin' | 'organizer', id: string) =>
    localStorage.setItem(
      'tf_session_v1',
      JSON.stringify({ role, id, displayName: 'Host', loginAt: 1 }),
    );

  beforeEach(() => {
    all = [make('t1'), make('t2', { organizerId: 'other' })];
    saveForgeState.mockClear();
    localStorage.removeItem('tf_session_v1');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'host', component: HostPage }]),
        { provide: FirestoreService, useValue: { db: {} } },
        {
          provide: TournamentService,
          useValue: {
            list: () => Promise.resolve(all),
            get: (id: string) => Promise.resolve(all.find((t) => t.id === id) ?? null),
            getKey,
            saveForgeState,
          },
        },
      ],
    });
  });

  afterEach(() => localStorage.removeItem('tf_session_v1'));

  const open = async (url: string) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    await harness.fixture.whenStable();
    fixture = harness.fixture;
    return fixture.nativeElement as HTMLElement;
  };

  const settle = async () => {
    await Promise.resolve();
    await fixture.whenStable();
  };

  const tabButton = (root: HTMLElement, text: string) =>
    Array.from(root.querySelectorAll('.dock-btn')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLElement;

  it('asks visitors who are not logged in to log in', async () => {
    const root = await open('/host');
    expect(root.textContent).toContain('please log in');
    expect(root.querySelector('tf-host-console')).toBeNull();
  });

  it('lists only the tournaments an organizer manages', async () => {
    loginAs('organizer', 'o1');
    const root = await open('/host');
    const rows = root.querySelectorAll('tf-list-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Cup t1');
    expect(root.querySelector('a[href*="id=t1"]')).not.toBeNull();
  });

  it('does not open a tournament the organizer does not manage', async () => {
    loginAs('organizer', 'o1');
    const root = await open('/host?id=t2');
    expect(root.textContent).toContain("you don't manage it");
    expect(root.querySelector('tf-host-console')).toBeNull();
  });

  it('opens the console with messages, players, key, bracket and results', async () => {
    loginAs('organizer', 'o1');
    const root = await open('/host?id=t1');
    const console_ = root.querySelector('tf-host-console') as HTMLElement;
    expect(console_).not.toBeNull();
    const labels = Array.from(console_.querySelectorAll('.dock-btn .label')).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels).toEqual(['Messages', 'Players', 'Key', 'Bracket', 'Results']);
    expect(console_.querySelector('.dock-btn .count')?.textContent).toContain('4');
    expect(console_.querySelector('.dock-btn.on .label')?.textContent).toBe('Messages');
    const visible = (selector: string) =>
      Array.from(console_.querySelectorAll(selector)).some(
        (e) => !(e.closest('tf-card') as HTMLElement).hidden,
      );
    expect(visible('tf-messages-list')).toBe(true);
    expect(visible('tf-registration-key-panel')).toBe(false);
    expect(console_.textContent).toContain('Registration key: 76258');
  });

  it('switches tabs, copies participants and runs the bracket from the console', async () => {
    loginAs('admin', 'admin');
    const root = await open('/host?id=t1');
    const shown = (selector: string) =>
      !((root.querySelector(selector) as HTMLElement).closest('tf-card') as HTMLElement).hidden;

    tabButton(root, 'Players').click();
    await settle();
    expect(shown('tf-participants-panel')).toBe(true);
    expect(root.querySelector('tf-participants-panel tf-chip-list')?.textContent).toContain('@a');
    expect(root.querySelector('tf-participants-panel tf-chunk-copy')?.textContent).toContain(
      'Copy participants',
    );

    tabButton(root, 'Key').click();
    await settle();
    expect(shown('tf-registration-key-panel')).toBe(true);
    expect(root.querySelector('tf-registration-key-panel .key')?.textContent).toContain('76258');

    tabButton(root, 'Bracket').click();
    await settle();
    const start = Array.from(root.querySelectorAll('tf-bracket-panel button')).find((b) =>
      b.textContent?.includes('Start Bracket'),
    ) as HTMLElement;
    start.click();
    await settle();
    expect(root.querySelectorAll('tf-bracket-stage').length).toBe(1);
    expect(saveForgeState).toHaveBeenCalled();
  });

  it('minimizes the floating menu to a small handle and remembers it', async () => {
    localStorage.removeItem('tf_host_dock_min');
    loginAs('admin', 'admin');
    const root = await open('/host?id=t1');
    expect(root.querySelectorAll('.dock-btn').length).toBe(5);
    (root.querySelector('.dock .toggle') as HTMLElement).click();
    await settle();
    expect(root.querySelectorAll('.dock-btn').length).toBe(0);
    expect(root.querySelector('.dock .toggle')).not.toBeNull();
    expect(localStorage.getItem('tf_host_dock_min')).toBe('1');
    (root.querySelector('.dock .toggle') as HTMLElement).click();
    await settle();
    expect(root.querySelectorAll('.dock-btn').length).toBe(5);
    localStorage.removeItem('tf_host_dock_min');
  });

  it('opens on the results tab for a finished tournament, with the closing message', async () => {
    all = [make('t1', { completed: true, closingMessage: 'GG everyone', startUTC: 1 })];
    loginAs('admin', 'admin');
    const root = await open('/host?id=t1');
    expect(
      (
        (root.querySelector('tf-card > tf-results-panel') as HTMLElement).closest(
          'tf-card',
        ) as HTMLElement
      ).hidden,
    ).toBe(false);
    expect(root.querySelector('tf-card > tf-results-panel')?.textContent).toContain('GG everyone');
    expect(root.querySelector('tf-card > tf-results-panel')?.textContent).toContain(
      'Copy closing message',
    );
  });
});
