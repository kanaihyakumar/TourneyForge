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
import { InboxService } from '../../core/services/inbox.service';
import { ClipboardService } from '../../core/services/clipboard.service';
import { PEER_FACTORY } from '../../core/services/chat-transport';
import { FakePeerHub } from '../../core/services/testing/fake-peers';
import { InboxThread } from '../../core/models/models';
import { DashboardPage } from './dashboard-page';

const tournament = (over: Record<string, unknown> = {}): Tournament =>
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
    locked: false,
    ...over,
  });

describe('DashboardPage', () => {
  const session: Session = { role: 'admin', id: 'admin', displayName: 'Admin' };
  const update = vi.fn();
  const get = vi.fn();
  const create = vi.fn();
  const quota = vi.fn();
  const getForgeState = vi.fn();
  const removeMany = vi.fn();
  const assign = vi.fn();
  const getKey = vi.fn();
  const renewKey = vi.fn();
  const disableKey = vi.fn();
  const loadThreads = vi.fn();
  const loadMine = vi.fn();
  const markRead = vi.fn();
  const reply = vi.fn();
  const deleteMessage = vi.fn();
  const deleteThread = vi.fn();
  const sendMessage = vi.fn();
  const threads = signal<InboxThread[] | undefined>(undefined);
  const myThread = signal<InboxThread | null | undefined>(undefined);
  const unread = signal(0);
  let current = tournament();

  beforeEach(() => {
    current = tournament();
    removeMany.mockReset().mockResolvedValue(1);
    assign.mockReset().mockResolvedValue(tournament());
    getKey.mockReset().mockResolvedValue('76258');
    renewKey.mockReset().mockResolvedValue('13579');
    disableKey.mockReset().mockResolvedValue(true);
    loadThreads.mockReset().mockResolvedValue(undefined);
    loadMine.mockReset().mockResolvedValue(undefined);
    markRead.mockReset().mockResolvedValue(undefined);
    reply.mockReset().mockResolvedValue(true);
    deleteMessage.mockReset().mockResolvedValue(true);
    deleteThread.mockReset().mockResolvedValue(true);
    sendMessage.mockReset().mockResolvedValue(true);
    threads.set([]);
    myThread.set(null);
    unread.set(0);
    getForgeState.mockReset().mockResolvedValue(null);
    quota.mockReset().mockResolvedValue({ limit: 0, used: 0, reached: false });
    update.mockReset().mockResolvedValue(tournament());
    get.mockReset().mockImplementation(() => Promise.resolve(current));
    create.mockReset().mockResolvedValue(tournament());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FirestoreService, useValue: { db: {} } },
        { provide: PEER_FACTORY, useValue: new FakePeerHub().factory },
        {
          provide: InboxService,
          useValue: {
            threads,
            myThread,
            unread,
            loadThreads,
            loadMine,
            markRead,
            reply,
            deleteMessage,
            deleteThread,
            send: sendMessage,
          },
        },
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
          useValue: {
            list: () => Promise.resolve([current]),
            get,
            update,
            create,
            quota,
            getForgeState,
            removeMany,
            assign,
            getKey,
            renewKey,
            disableKey,
          },
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
                {
                  id: 'o3',
                  username: 'ben',
                  usernameLower: 'ben',
                  password: 'x',
                  displayName: 'Ben',
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
    expect(root.textContent).toContain('assigned to Admin');
    expect(root.querySelectorAll('tf-tabs button').length).toBe(5);
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

  const asOrganizer = () =>
    TestBed.overrideProvider(AuthService, {
      useValue: {
        session: signal<Session | null>({ role: 'organizer', id: 'o2', displayName: 'Bella' }),
        isAdmin: signal(false),
        canViewOrganizers: signal(false),
        openLogin: vi.fn(),
      },
    });

  const tabButton = (root: HTMLElement, needle: string) =>
    Array.from(root.querySelectorAll('tf-tabs button')).find((b) =>
      b.textContent?.includes(needle),
    ) as HTMLButtonElement | undefined;

  const button = (root: HTMLElement, needle: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle)) as
      HTMLButtonElement | undefined;

  it('locks a published tournament for organizers: results only, no delete', async () => {
    current = tournament({ locked: true });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    expect(root.textContent).toContain('🔒 Published');
    expect(button(root, 'Delete')).toBeUndefined();
    expect(button(root, 'Clear data')).toBeUndefined();
    expect(button(root, 'Edit')).toBeUndefined();
    button(root, 'Results')?.click();
    await settle(fixture);

    expect(root.querySelector('tf-tournament-form')?.textContent).toContain('published and locked');
    expect(root.querySelector('tf-tournament-form fieldset')?.hasAttribute('disabled')).toBe(true);
    (root.querySelector('#tf_winner1') as HTMLInputElement).value = 'NewChamp';
    (root.querySelector('#tf_winner1') as HTMLInputElement).dispatchEvent(new Event('input'));
    (root.querySelector('tf-tournament-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await settle(fixture);

    expect(root.querySelector('tf-publish-confirm-modal [role="dialog"]')).toBeNull();
    const payload = update.mock.calls[0][1];
    expect(Object.keys(payload).sort()).toEqual(['closingMessage', 'winners']);
    expect(payload.winners[0].name).toBe('NewChamp');
  });

  it('asks organizers to confirm before publishing, then locks again', async () => {
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    expect(root.textContent).toContain('🔓 Editing allowed');
    button(root, 'Edit')?.click();
    await settle(fixture);
    (root.querySelector('tf-tournament-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await settle(fixture);

    const dialog = root.querySelector('tf-publish-confirm-modal [role="dialog"]');
    expect(update).not.toHaveBeenCalled();
    expect(dialog?.textContent).toContain('cannot be edited');
    expect(dialog?.textContent).toContain("organizers can't delete it");
    expect(dialog?.textContent).toContain('Speedy40');

    button(root, 'Go back')?.click();
    await settle(fixture);
    expect(update).not.toHaveBeenCalled();

    (root.querySelector('tf-tournament-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await settle(fixture);
    button(root, 'Yes, publish')?.click();
    await settle(fixture);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1]).toMatchObject({ title: 'Carrom Cup', locked: true });
  });

  it('lets an admin unlock and lock a tournament', async () => {
    current = tournament({ locked: true });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    expect(button(root, 'Delete')).toBeDefined();
    expect(button(root, 'Clear data')).toBeDefined();
    button(root, 'Allow editing')?.click();
    await settle(fixture);
    expect(update).toHaveBeenCalledWith('t1', { locked: false }, expect.anything());
  });

  it('stops an organizer at their tournament limit', async () => {
    quota.mockResolvedValue({ limit: 1, used: 1, reached: true });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    expect(root.querySelector('tf-tournament-form')?.textContent).toContain(
      'created 1 of 1 allowed tournaments',
    );
    const publish = root.querySelector('tf-tournament-form button[type="submit"]');
    expect((publish as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the tournaments tab after switching from admin to an organizer', async () => {
    const sessionSignal = signal<Session | null>(session);
    const isAdmin = signal(true);
    const canView = signal(true);
    TestBed.overrideProvider(AuthService, {
      useValue: {
        session: sessionSignal,
        isAdmin,
        canViewOrganizers: canView,
        openLogin: vi.fn(),
      },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    tabButton(root, 'Usage')?.click();
    await settle(fixture);
    expect(root.querySelector('tf-usage-panel')?.closest('section')?.hidden).toBe(false);

    isAdmin.set(false);
    canView.set(false);
    sessionSignal.set({ role: 'organizer', id: 'o2', displayName: 'Bella' });
    await settle(fixture);

    expect(root.querySelector('tf-tournament-list')?.closest('section')?.hidden).toBe(false);
    expect(root.querySelectorAll('tf-tabs button').length).toBe(3);
  });

  const finishedBracket = {
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

  it('keeps winners locked until the bracket has a winner, then offers to pull them', async () => {
    current = tournament({ winners: [], announcement: '🥇 1st — 20 Pips\n🥈 2nd — 10 Pips' });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    button(root, 'Edit')?.click();
    await settle(fixture);
    const winners = () => root.querySelector('fieldset:has(#tf_winner1)');
    expect(winners()?.hasAttribute('disabled')).toBe(true);
    expect(root.textContent).toContain('Winners unlock once the Match Bracket is complete');
    expect(button(root, 'Pull winners')).toBeUndefined();

    current = tournament({
      winners: [],
      announcement: '🥇 1st — 20 Pips\n🥈 2nd — 10 Pips',
      forgeState: finishedBracket,
    });
    getForgeState.mockResolvedValue(finishedBracket);
    button(root, 'Cancel edit')?.click();
    await settle(fixture);
    button(root, 'Edit')?.click();
    await settle(fixture);

    expect(winners()?.hasAttribute('disabled')).toBe(false);
    button(root, 'Pull winners')?.click();
    await settle(fixture);
    const value = (id: string) => (root.querySelector('#' + id) as HTMLInputElement).value;
    expect(value('tf_winner1')).toBe('@Alice');
    expect(value('tf_winner2')).toBe('@Bob');
    expect(value('tf_prize1')).toBe('20 Pips');
    expect(value('tf_prize2')).toBe('10 Pips');
  });

  it('refreshes the list when the organizer returns to the tab so an unlock shows up', async () => {
    current = tournament({ locked: true });
    const list = vi.fn().mockImplementation(() => Promise.resolve([current]));
    TestBed.overrideProvider(TournamentService, {
      useValue: { list, get, update, create, quota, getForgeState, removeMany },
    });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(button(root, 'Results')).toBeDefined();
    expect(button(root, 'Edit')).toBeUndefined();

    current = tournament({ locked: false });
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    window.dispatchEvent(new Event('focus'));
    await settle(fixture);
    clock.mockRestore();

    expect(list).toHaveBeenCalledTimes(2);
    expect(button(root, 'Edit')).toBeDefined();
    expect(button(root, 'Results')).toBeUndefined();
  });

  it('lets an admin delete selected tournaments completely from the Usage tab', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    tabButton(root, 'Usage')?.click();
    await settle(fixture);

    const remove = () => button(root, 'Delete selected tournaments completely');
    expect(remove()?.disabled).toBe(true);
    (root.querySelector('tf-usage-panel tf-checkbox input') as HTMLInputElement).click();
    await settle(fixture);
    expect(remove()?.disabled).toBe(false);
    remove()?.click();
    await settle(fixture);

    expect(confirmSpy.mock.calls[0][0]).toContain('Carrom Cup');
    expect(removeMany).toHaveBeenCalledWith(['t1'], expect.anything());
    confirmSpy.mockRestore();
  });

  it('shows admins live chat requests and organizer messages in the Notifications tab', async () => {
    threads.set([
      {
        organizerId: 'o2',
        organizerName: 'Bella',
        adminUnread: true,
        organizerUnread: false,
        updatedAt: 2,
        messages: [{ id: 'm1', from: 'organizer', text: 'Please unlock my tournament', at: 1 }],
      },
    ]);
    unread.set(1);
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const tabs = Array.from(root.querySelectorAll('tf-tabs button'));
    const notifications = tabs.find((b) => b.textContent?.includes('Notifications'));
    expect(notifications?.textContent).toContain('1');
    expect(tabs.some((b) => b.textContent?.includes('Messages'))).toBe(false);
    (notifications as HTMLElement).click();
    await settle(fixture);

    expect(loadThreads).toHaveBeenCalled();
    const panel = root.querySelector('tf-notifications-panel') as HTMLElement;
    expect(panel.textContent).toContain('No live chat requests right now.');
    button(panel, 'Bella')?.click();
    await settle(fixture);
    expect(markRead).toHaveBeenCalledWith('o2');
    expect(panel.textContent).toContain('Please unlock my tournament');

    const box = panel.querySelector('tf-chat-thread textarea') as HTMLTextAreaElement;
    box.value = 'Done, it is unlocked';
    box.dispatchEvent(new Event('input'));
    await settle(fixture);
    button(panel, 'Send')?.click();
    await settle(fixture);
    expect(reply).toHaveBeenCalledWith('o2', 'Done, it is unlocked');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    (panel.querySelector('button[aria-label="Delete message"]') as HTMLElement).click();
    await settle(fixture);
    expect(deleteMessage).toHaveBeenCalledWith('o2', 'm1');

    button(panel, 'Delete conversation')?.click();
    await settle(fixture);
    expect(confirmSpy.mock.calls.at(-1)?.[0]).toContain('Bella');
    expect(deleteThread).toHaveBeenCalledWith('o2');
    expect(panel.querySelector('tf-chat-thread')).toBeNull();
    confirmSpy.mockRestore();
  });

  it('lets an organizer message the admin from the Messages tab', async () => {
    myThread.set({
      organizerId: 'o2',
      organizerName: 'Bella',
      adminUnread: false,
      organizerUnread: true,
      updatedAt: 2,
      messages: [{ id: 'm1', from: 'admin', text: 'Unlocked for you', at: 1 }],
    });
    unread.set(1);
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const tabs = Array.from(root.querySelectorAll('tf-tabs button'));
    expect(tabs.some((b) => b.textContent?.includes('Notifications'))).toBe(false);
    const messages = tabs.find((b) => b.textContent?.includes('Messages')) as HTMLElement;
    expect(messages.textContent).toContain('1');
    messages.click();
    await settle(fixture);

    expect(loadMine).toHaveBeenCalled();
    expect(markRead).toHaveBeenCalled();
    const panel = root.querySelector('tf-support-messages') as HTMLElement;
    expect(panel.textContent).toContain('Unlocked for you');
    const box = panel.querySelector('tf-chat-thread textarea') as HTMLTextAreaElement;
    box.value = 'Thanks!';
    box.dispatchEvent(new Event('input'));
    await settle(fixture);
    button(panel, 'Send')?.click();
    await settle(fixture);
    expect(sendMessage).toHaveBeenCalledWith('Thanks!');
  });

  it('switches registration between soon, open and closed with one control', async () => {
    const future = { startUTC: Date.now() + 86_400_000 };
    const segments = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('tf-segmented [role="radio"]')) as HTMLButtonElement[];
    const active = (root: HTMLElement) =>
      segments(root)
        .filter((b) => b.getAttribute('aria-checked') === 'true')
        .map((b) => b.textContent?.trim());
    const pick = async (
      fixture: { whenStable(): Promise<unknown> },
      root: HTMLElement,
      label: string,
    ) => {
      segments(root)
        .find((b) => b.textContent?.includes(label))
        ?.click();
      await settle(fixture as never);
    };

    current = tournament({ ...future, locked: true });
    update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => {
      current = tournament({ ...future, locked: true, ...patch });
      return current;
    });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(segments(root).map((b) => b.textContent?.trim())).toEqual([
      '🔔 Soon',
      '⚔️ Open',
      '🔒 Closed',
    ]);
    expect(active(root)).toEqual(['⚔️ Open']);

    await pick(fixture, root, 'Soon');
    expect(update).toHaveBeenLastCalledWith(
      't1',
      { registrationSoon: true, registrationClosed: false },
      expect.anything(),
    );
    await pick(fixture, root, 'Closed');
    expect(update).toHaveBeenLastCalledWith(
      't1',
      { registrationSoon: false, registrationClosed: true },
      expect.anything(),
    );
    await pick(fixture, root, 'Open');
    expect(update).toHaveBeenLastCalledWith(
      't1',
      { registrationSoon: false, registrationClosed: false, registrationOpensAt: 0 },
      expect.anything(),
    );
    const calls = update.mock.calls.length;
    await pick(fixture, root, 'Open');
    expect(update.mock.calls.length).toBe(calls);
    fixture.destroy();

    const states: [Record<string, unknown>, string, string][] = [
      [{ registrationSoon: true }, '🔔 Soon', 'registration coming soon'],
      [{ registrationOpensAt: Date.now() + 3600_000 }, '🔔 Soon', 'registration opens'],
      [{ registrationClosed: true }, '🔒 Closed', 'registration closed'],
    ];
    for (const [over, label, text] of states) {
      current = tournament({ ...future, locked: true, ...over });
      const next = TestBed.createComponent(DashboardPage);
      const nextRoot = next.nativeElement as HTMLElement;
      await settle(next);
      expect(active(nextRoot)).toEqual([label]);
      expect(nextRoot.querySelector('tf-tournament-list')?.textContent).toContain(text);
      next.destroy();
    }

    current = tournament({ locked: true });
    const done = TestBed.createComponent(DashboardPage);
    await settle(done);
    expect((done.nativeElement as HTMLElement).querySelector('tf-segmented')).toBeNull();
  });

  it('lets an admin assign several organizers to a tournament and remove them', async () => {
    current = tournament({ organizerId: 'admin', organizerName: 'Admin', managerIds: [] });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    button(root, 'Assign')?.click();
    await settle(fixture);
    const modal = root.querySelector('tf-assign-modal') as HTMLElement;
    const boxes = () =>
      Array.from(modal.querySelectorAll('tf-checkbox input')) as HTMLInputElement[];
    expect(boxes().length).toBe(2);
    expect(boxes().some((b) => b.checked)).toBe(false);
    expect(button(modal, 'Save assignment')?.disabled).toBe(true);
    expect(button(modal, 'Remove all')).toBeUndefined();
    expect(modal.textContent).toContain('belongs to Admin');

    boxes()[0].click();
    boxes()[1].click();
    await settle(fixture);
    expect(modal.textContent).toContain('Bella is the primary organizer');
    expect(button(modal, 'Save assignment')?.disabled).toBe(false);
    button(modal, 'Save assignment')?.click();
    await settle(fixture);
    expect(assign).toHaveBeenLastCalledWith(
      't1',
      [
        { id: 'o2', displayName: 'Bella' },
        { id: 'o3', displayName: 'Ben' },
      ],
      expect.anything(),
    );
    expect(root.querySelector('tf-assign-modal [role="dialog"]')).toBeNull();
    fixture.destroy();

    current = tournament({ organizerId: 'o2', organizerName: 'Bella', managerIds: ['o3'] });
    const again = TestBed.createComponent(DashboardPage);
    const root2 = again.nativeElement as HTMLElement;
    await settle(again);
    const list = (root2.querySelector('tf-tournament-list')?.textContent ?? '').replace(
      /\s+/g,
      ' ',
    );
    expect(list).toContain('assigned to Bella');
    expect(list).toContain('co-managed by Ben');
    button(root2, 'Assign')?.click();
    await settle(again);
    const modal2 = root2.querySelector('tf-assign-modal') as HTMLElement;
    const checks = Array.from(modal2.querySelectorAll('tf-checkbox input')) as HTMLInputElement[];
    expect(checks.map((c) => c.checked)).toEqual([true, true]);

    checks[0].click();
    await settle(again);
    expect(modal2.textContent).toContain('Ben is the primary organizer');
    button(modal2, 'Save assignment')?.click();
    await settle(again);
    expect(assign).toHaveBeenLastCalledWith(
      't1',
      [{ id: 'o3', displayName: 'Ben' }],
      expect.anything(),
    );

    button(root2, 'Assign')?.click();
    await settle(again);
    button(root2.querySelector('tf-assign-modal') as HTMLElement, 'Remove all')?.click();
    await settle(again);
    expect(assign).toHaveBeenLastCalledWith('t1', [], expect.anything());
  });

  it('does not show the Assign action to organizers', async () => {
    current = tournament({ organizerId: 'o2', organizerName: 'Bella' });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(button(root, 'Assign')).toBeUndefined();
  });

  it('never shows organizers a Delete button, even on an unlocked tournament', async () => {
    current = tournament({ organizerId: 'o2', organizerName: 'Bella', locked: false });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(button(root, 'Edit')).toBeDefined();
    expect(button(root, 'Delete')).toBeUndefined();
  });

  it('hides co-managers and owners that no longer exist as organizers', async () => {
    current = tournament({
      organizerId: 'admin',
      organizerName: 'Bella',
      managerIds: ['o2', 'deleted-1', 'deleted-2'],
    });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const text = (root.querySelector('tf-tournament-list')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('co-managed by Bella');
    expect(text).not.toContain('deleted-1');
    expect(text).not.toContain('deleted-2');
    expect(text).toContain('assigned to Admin');
    fixture.destroy();

    current = tournament({
      organizerId: 'admin',
      organizerName: 'Admin',
      managerIds: ['deleted-1'],
    });
    const again = TestBed.createComponent(DashboardPage);
    await settle(again);
    expect((again.nativeElement as HTMLElement).textContent).not.toContain('co-managed');
  });

  it('shows the How to use button on the dashboard for an admin', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    await settle(fixture);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tf-how-to button'),
    ).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['❓ How to use']);
  });

  it('shows the How to use button on the dashboard for an organizer', async () => {
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    await settle(fixture);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tf-how-to button'),
    ).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['❓ How to use']);
  });

  it('opens on My Tournaments, with Create in its own tab', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const tabs = Array.from(root.querySelectorAll('tf-tabs button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(tabs.slice(0, 2)).toEqual(['📋 My Tournaments', '➕ Create']);
    expect(root.querySelector('tf-tournament-list')?.closest('section')?.hidden).toBe(false);
    expect(root.querySelector('tf-tournament-form')?.closest('section')?.hidden).toBe(true);
    expect(root.querySelector('tf-tournament-list')?.textContent).toContain('Carrom Cup');

    button(root, 'New tournament')?.click();
    await settle(fixture);
    expect(root.querySelector('tf-tournament-form')?.closest('section')?.hidden).toBe(false);
    expect(root.querySelector('tf-tournament-list')?.closest('section')?.hidden).toBe(true);
    expect(tabButton(root, 'Create')?.getAttribute('aria-selected')).toBe('true');

    tabButton(root, 'My Tournaments')?.click();
    await settle(fixture);
    expect(root.querySelector('tf-tournament-list')?.closest('section')?.hidden).toBe(false);
  });

  it('jumps to the Create tab when editing and back to the list on cancel and on save', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    const formHidden = () =>
      (root.querySelector('tf-tournament-form')?.closest('section') as HTMLElement).hidden;

    button(root, 'Edit')?.click();
    await settle(fixture);
    expect(formHidden()).toBe(false);
    expect(tabButton(root, 'Editing')).toBeDefined();
    expect((root.querySelector('#tf_title') as HTMLInputElement).value).toBe('Carrom Cup');

    button(root, 'Cancel edit')?.click();
    await settle(fixture);
    expect(formHidden()).toBe(true);
    expect(tabButton(root, 'Create')).toBeDefined();
    expect(tabButton(root, 'Editing')).toBeUndefined();

    button(root, 'Edit')?.click();
    await settle(fixture);
    (root.querySelector('tf-tournament-form form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await settle(fixture);
    expect(update).toHaveBeenCalled();
    expect(formHidden()).toBe(true);
    expect(root.querySelector('tf-tournament-list')?.closest('section')?.hidden).toBe(false);
  });

  it('lets staff see, copy, renew and turn off the registration key', async () => {
    current = tournament({ startUTC: Date.now() + 86_400_000, keyRequired: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(root.querySelector('tf-tournament-list')?.textContent).toContain('Key');

    button(root, 'Key')?.click();
    await settle(fixture);
    const modal = root.querySelector('tf-registration-key-modal') as HTMLElement;
    expect(getKey).toHaveBeenCalledWith('t1', expect.anything());
    expect(modal.querySelector('.key')?.textContent?.trim()).toBe('76258');
    const preview = modal.querySelector('.preview')?.textContent ?? '';
    expect(preview).toContain('Registration key: 76258');
    expect(preview).toContain(location.origin);
    expect(preview).toContain('Carrom Cup');
    expect(preview.length).toBeLessThanOrEqual(256);
    expect(button(modal, 'Copy key')).toBeDefined();
    expect(button(modal, 'Copy registration message')).toBeDefined();

    button(modal, 'New key')?.click();
    await settle(fixture);
    expect(renewKey).toHaveBeenCalledWith('t1', expect.anything());
    expect(modal.querySelector('.key')?.textContent?.trim()).toBe('13579');

    button(modal, 'Turn off key')?.click();
    await settle(fixture);
    expect(disableKey).toHaveBeenCalledWith('t1', expect.anything());
    expect(modal.querySelector('.key')).toBeNull();
    expect(modal.textContent).toContain('no registration key');

    button(modal, 'Require a key')?.click();
    await settle(fixture);
    expect(modal.querySelector('.key')?.textContent?.trim()).toBe('13579');
    confirmSpy.mockRestore();
  });

  it('hides the Key button once a tournament is finished', async () => {
    current = tournament({ completed: true, keyRequired: true });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    expect(button(root, 'Key')).toBeUndefined();
  });

  it('puts the registration key into the Registration open message', async () => {
    current = tournament({ startUTC: Date.now() + 86_400_000, keyRequired: true });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    button(root, 'Messages')?.click();
    await settle(fixture);
    const modal = root.querySelector('tf-messages-modal') as HTMLElement;
    const text = (modal.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Registration key: 76258');
    expect(text).toContain(location.origin);
  });

  it('copies the registration message in one tap while registration is open', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    TestBed.overrideProvider(ClipboardService, { useValue: { copy } });
    current = tournament({ startUTC: Date.now() + 86_400_000, keyRequired: true });
    asOrganizer();
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);

    const copyButton = () => button(root, 'Copy registration message');
    expect(copyButton()).toBeDefined();
    copyButton()?.click();
    await settle(fixture);
    expect(getKey).toHaveBeenCalledWith('t1', expect.anything());
    const [text, toast] = copy.mock.calls[0];
    expect(text).toContain('Registration key: 76258');
    expect(text).toContain('Carrom Cup');
    expect(text).toContain(location.origin);
    expect(toast).toContain('Paste it in your group');
  });

  it('only offers the copy button while registration is open, and works without a key', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    TestBed.overrideProvider(ClipboardService, { useValue: { copy } });
    const future = { startUTC: Date.now() + 86_400_000 };
    current = tournament({ ...future, registrationSoon: true });
    const soon = TestBed.createComponent(DashboardPage);
    await settle(soon);
    expect(button(soon.nativeElement, 'Copy registration message')).toBeUndefined();
    soon.destroy();

    current = tournament({ ...future, registrationClosed: true });
    const closed = TestBed.createComponent(DashboardPage);
    await settle(closed);
    expect(button(closed.nativeElement, 'Copy registration message')).toBeUndefined();
    closed.destroy();

    current = tournament({ ...future });
    const open = TestBed.createComponent(DashboardPage);
    await settle(open);
    button(open.nativeElement, 'Copy registration message')?.click();
    await settle(open);
    expect(getKey).not.toHaveBeenCalled();
    expect(copy.mock.calls[0][0]).toContain('Register here:');
    expect(copy.mock.calls[0][0]).not.toContain('key');
  });

  it('pins the registration message at the top of the suggested messages', async () => {
    current = tournament({ startUTC: Date.now() + 86_400_000, keyRequired: true });
    const fixture = TestBed.createComponent(DashboardPage);
    const root = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    button(root, 'Messages')?.click();
    await settle(fixture);
    const modal = root.querySelector('tf-messages-modal') as HTMLElement;
    const headings = Array.from(modal.querySelectorAll('h3.category')).map((h) =>
      h.textContent?.trim(),
    );
    expect(headings[0]).toBe('⭐ Share first - when registration opens');
    expect(headings[1]).toBe('Greeting');
    expect(modal.querySelector('.message .text')?.textContent).toContain('Registration key: 76258');
    expect(
      Array.from(modal.querySelectorAll('.message .top strong')).filter(
        (e) => e.textContent?.trim() === 'Registration open',
      ).length,
    ).toBe(1);
  });
});
