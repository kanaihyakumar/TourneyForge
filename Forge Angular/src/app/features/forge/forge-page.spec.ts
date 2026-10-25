import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { withMeta } from '../../core/utils/tournament';
import { ForgePage } from './forge-page';
import { ForgeStore } from './forge-store';

const tournament = withMeta('t1', {
  title: 'Cup',
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
  registrations: ['a', 'b', 'c', 'd'].map((platoId) => ({ platoId, registeredAt: 1 })),
  createdAt: 0,
  updatedAt: 0,
});

let current = tournament;

describe('ForgePage', () => {
  const saveForgeState = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    saveForgeState.mockClear();
    current = tournament;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FirestoreService, useValue: { db: {} } },
        {
          provide: ForgeImportService,
          useValue: {
            read: () => ({
              tournamentId: 't1',
              title: 'Cup',
              game: 'Carrom',
              members: ['a', 'b', 'c', 'd'],
            }),
            clear: () => undefined,
          },
        },
        {
          provide: TournamentService,
          useValue: { get: () => Promise.resolve(current), saveForgeState },
        },
      ],
    });
  });

  const click = (root: HTMLElement, selector: string, index = 0) =>
    (root.querySelectorAll(selector)[index] as HTMLElement).click();

  it('runs a full knockout bracket and shows the podium', async () => {
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    expect(root.textContent).toContain('Building the bracket for "Cup" - 4 participant(s)');
    expect(root.textContent).toContain('4 participants added');
    expect(root.querySelectorAll('tf-chip').length).toBe(4);

    const start = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Start Bracket'),
    );
    start?.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('tf-bracket-stage').length).toBe(1);
    expect(saveForgeState).toHaveBeenCalled();

    click(root, 'tf-bracket-stage .pick', 0);
    click(root, 'tf-bracket-stage .pick', 2);
    await fixture.whenStable();
    expect(root.textContent).toContain('Generate Next Match Set (Final Match)');

    const next = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Generate Next'),
    );
    next?.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('tf-bracket-stage').length).toBe(3);

    const lastStage = () => root.querySelectorAll('tf-bracket-stage');
    for (const stage of [lastStage()[1], lastStage()[2]]) {
      (stage.querySelector('.pick') as HTMLElement).click();
      await fixture.whenStable();
    }
    expect(root.querySelector('tf-podium')?.textContent).toContain('Tournament Results');
    expect(root.querySelector('tf-podium')?.textContent).toContain('1st Place');
    expect(root.querySelector('tf-podium')?.textContent).toContain('4th Place');
    const thanks = root.querySelector('tf-podium tf-thanks-note') as HTMLElement;
    expect(thanks.textContent).toContain('Enjoyed TourneyForge');
    expect(thanks.textContent).toContain('gift');
    expect(thanks.textContent).toContain('Speedy40');
    expect(thanks.querySelector('tf-chunk-copy button')?.textContent).toContain(
      'Copy thank-you message',
    );
  });

  it('runs a four-player-per-table bracket and records werewolf points', async () => {
    current = withMeta('t1', {
      title: 'Wolves',
      game: 'Werewolf',
      format: '7p',
      playersPerMatch: 4,
      gameMode: 'Live',
      slots: 8,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      scoring: {
        enabled: true,
        villagersWin: 2,
        villagersLose: 0,
        werewolvesWin: 3,
        werewolvesLose: 0,
        proPoints: 1,
        nabPoints: 1,
      },
      registrations: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((platoId) => ({
        platoId,
        registeredAt: 1,
      })),
      createdAt: 0,
      updatedAt: 0,
    });
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();

    const text = (needle: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle));
    text('Start Bracket')?.click();
    await fixture.whenStable();
    const matches = root.querySelectorAll('tf-bracket-stage .match');
    expect(matches.length).toBe(2);
    expect(matches[0].querySelectorAll('.pick').length).toBe(4);

    click(root, 'tf-bracket-stage .match:nth-child(1) .pick', 0);
    click(root, 'tf-bracket-stage .match:nth-child(2) .pick', 1);
    await fixture.whenStable();
    expect(text('Generate Next Match Set')).toBeTruthy();
    text('Generate Next Match Set')?.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('tf-bracket-stage').length).toBe(2);
    (root.querySelectorAll('tf-bracket-stage')[1].querySelector('.pick') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelector('tf-podium')?.textContent).toContain('1st Place');

    expect(root.querySelector('tf-scoring-panel')?.textContent).toContain('Villagers: win +2');
    const store = fixture.debugElement.injector.get(ForgeStore);
    store.setPlayerResult('x', 'Game', ['a', 'b', 'c'], 'c', 'werewolves', true);
    store.setPlayerResult('x', 'Game', ['a', 'b', 'c'], 'a', 'villagers', false);
    store.setMark('x', 'Game', ['a', 'b', 'c'], 'c', 'pro');
    await fixture.whenStable();
    const rows = Array.from(root.querySelectorAll('tf-leaderboard .row')).map((r) => r.textContent);
    expect(rows[0]).toContain('@c');
    expect(rows[0]).toContain('4 pts');
    expect(rows[0]).toContain('Pro ×1');
    expect(saveForgeState).toHaveBeenCalled();
  });

  it('lets werewolf tables advance any number of players and hints at full games', async () => {
    const ids = Array.from({ length: 18 }, (_, i) => `p${i}`);
    current = withMeta('t1', {
      title: 'Wolves',
      game: 'Werewolf',
      format: '9p',
      playersPerMatch: 9,
      slots: 18,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      registrations: ids.map((platoId) => ({ platoId, registeredAt: 1 })),
      createdAt: 0,
      updatedAt: 0,
    });
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const button = (needle: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle));

    button('Start Bracket')?.click();
    await fixture.whenStable();
    const pick = (match: number, count: number) => {
      for (let i = 0; i < count; i++)
        click(root, `tf-bracket-stage .match:nth-child(${match}) .pick`, i);
    };
    pick(1, 4);
    pick(2, 4);
    await fixture.whenStable();
    expect(root.textContent).toContain('8 players advance');
    expect(root.textContent).toContain('For full games of 9 players, 9 players should advance');

    click(root, 'tf-bracket-stage .match:nth-child(2) .pick', 4);
    await fixture.whenStable();
    expect(root.textContent).toContain('9 players advance - next round has 1 table (9 players)');
    button('Generate Next Match Set')?.click();
    await fixture.whenStable();
    const stages = root.querySelectorAll('tf-bracket-stage');
    expect(stages.length).toBe(2);
    expect(stages[1].querySelectorAll('.pick').length).toBe(9);
    expect(stages[1].textContent).toContain('Pick the winner first');
    const picks = stages[1].querySelectorAll('.pick');
    (picks[3] as HTMLElement).click();
    (picks[5] as HTMLElement).click();
    (picks[0] as HTMLElement).click();
    await fixture.whenStable();
    const podium = root.querySelector('tf-podium')?.textContent ?? '';
    expect(podium).toContain('1st Place');
    expect(podium).toContain('2nd Place');
    expect(podium).toContain('3rd Place');
    expect(podium).not.toContain('4th Place');
  });

  it('records a table result with one tap per werewolf and Pro / Nab marks', async () => {
    current = withMeta('t1', {
      title: 'Wolves',
      game: 'Werewolf',
      format: '7p',
      playersPerMatch: 4,
      slots: 8,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      scoring: {
        enabled: true,
        villagersWin: 2,
        villagersLose: 0,
        werewolvesWin: 3,
        werewolvesLose: 0,
        proPoints: 1,
        nabPoints: 1,
      },
      registrations: ['aiden', 'maya', 'lucas', 'nora', 'ethan', 'zoe', 'mason', 'ivy'].map(
        (platoId) => ({ platoId, registeredAt: 1 }),
      ),
      createdAt: 0,
      updatedAt: 0,
    });
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const button = (scope: ParentNode, needle: string) =>
      Array.from(scope.querySelectorAll('button')).find((b) =>
        b.textContent?.includes(needle),
      ) as HTMLElement;

    button(root, 'Start Bracket').click();
    await fixture.whenStable();
    const firstMatch = root.querySelector('tf-bracket-stage .match') as HTMLElement;
    const players = Array.from(firstMatch.querySelectorAll('.pick span')).map(
      (e) => e.textContent?.replace('@', '').trim() as string,
    );
    const click2 = (label: string) =>
      (firstMatch.querySelector(`[aria-label="${label}"]`) as HTMLElement).click();
    const wolf = players[0];
    (firstMatch.querySelectorAll('.pick')[0] as HTMLElement).click();
    (firstMatch.querySelectorAll('.pick')[1] as HTMLElement).click();
    await fixture.whenStable();
    click2(`Werewolf won - ${wolf}`);
    click2(`Villager won - ${players[1]}`);
    await fixture.whenStable();
    button(firstMatch, 'Werewolves won').click();
    await fixture.whenStable();
    expect(firstMatch.textContent).toContain('4/4 players recorded');
    const row = (name: string) =>
      Array.from(root.querySelectorAll('tf-leaderboard .row')).find((r) =>
        r.textContent?.includes('@' + name),
      )?.textContent ?? '';
    expect(row(wolf)).toContain('3 pts');
    expect(row(players[3])).toContain('0 pts');
    expect(firstMatch.textContent).toContain('not advancing - no points');
    expect(row(players[1])).toContain('0 pts');
    const results = root.querySelector('tf-podium')?.textContent ?? '';
    expect(results).toContain('by points');
    expect(results).toContain('@' + wolf);
    expect(results).toContain('1st Place');
    expect(results).toContain('3 pts');
    click2(`Villager won - ${players[1]}`);
    await fixture.whenStable();
    expect(row(players[1])).toContain('2 pts');
    const isOn = (label: string) =>
      (
        firstMatch.querySelector(`[aria-label="${label} - ${players[1]}"]`) as HTMLElement
      ).classList.contains('on');
    expect(isOn('Pro') || isOn('Nab')).toBe(false);
    click2(`Pro - ${players[1]}`);
    await fixture.whenStable();
    expect(isOn('Pro')).toBe(true);
    expect(row(players[1])).toContain('3 pts');
    click2(`Nab - ${players[1]}`);
    await fixture.whenStable();
    expect(isOn('Pro')).toBe(false);
    expect(isOn('Nab')).toBe(true);
    expect(row(players[1])).toContain('1 pts');
    click2(`Nab - ${players[1]}`);
    await fixture.whenStable();
    expect(isOn('Nab')).toBe(false);
    expect(row(players[1])).toContain('2 pts');
    expect(firstMatch.textContent).toContain('⭐ 3 pts');
    expect(firstMatch.textContent).toContain('+3');
  });

  it('clears points, results and the leaderboard when the bracket is reset', async () => {
    current = withMeta('t1', {
      title: 'Wolves',
      game: 'Werewolf',
      format: '7p',
      playersPerMatch: 4,
      slots: 8,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      scoring: {
        enabled: true,
        villagersWin: 2,
        villagersLose: 0,
        werewolvesWin: 3,
        werewolvesLose: 0,
        proPoints: 1,
        nabPoints: 1,
      },
      registrations: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((platoId) => ({
        platoId,
        registeredAt: 1,
      })),
      createdAt: 0,
      updatedAt: 0,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const button = (needle: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle));

    button('Start Bracket')?.click();
    await fixture.whenStable();
    const match = root.querySelector('tf-bracket-stage .match') as HTMLElement;
    (match.querySelector('.pick') as HTMLElement).click();
    (match.querySelector('[aria-label^="Villager won"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelector('tf-podium')?.textContent).toContain('by points');
    expect(root.querySelector('tf-leaderboard')?.textContent).toContain('2 pts');

    button('Reset Bracket')?.click();
    await fixture.whenStable();
    expect(root.querySelector('tf-podium')).toBeNull();
    expect(root.querySelector('tf-leaderboard')?.textContent).not.toContain('2 pts');
    expect(fixture.debugElement.injector.get(ForgeStore).games()).toEqual([]);
  });

  it('runs Bingo as rounds with one winner per game and a free choice of next players', async () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    current = withMeta('t1', {
      title: 'Bingo Night',
      game: 'Bingo',
      format: '15p',
      playersPerMatch: 15,
      slots: 15,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      registrations: ids.map((platoId) => ({ platoId, registeredAt: 1 })),
      createdAt: 0,
      updatedAt: 0,
    });
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const button = (needle: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle));

    button('Start Bracket')?.click();
    await fixture.whenStable();
    let stages = root.querySelectorAll('tf-bracket-stage');
    expect(stages.length).toBe(1);
    expect(stages[0].textContent).toContain('Round 1');
    expect(stages[0].querySelectorAll('.pick').length).toBe(15);
    expect(root.textContent).not.toContain('Tournament Results');
    expect(root.querySelector('tf-thanks-note')).toBeNull();

    (stages[0].querySelectorAll('.pick')[4] as HTMLElement).click();
    (stages[0].querySelectorAll('.pick')[9] as HTMLElement).click();
    await fixture.whenStable();
    expect(stages[0].querySelectorAll('.is-winner').length).toBe(1);

    expect(root.querySelector('tf-next-round-planner')).not.toBeNull();
    expect(root.querySelector('tf-next-round-planner')?.textContent).toContain(
      '15 players - 1 game of 15',
    );
    expect(root.querySelector('tf-podium')).toBeNull();

    button('Clear')?.click();
    await fixture.whenStable();
    const planner = root.querySelector('tf-next-round-planner') as HTMLElement;
    for (const i of [0, 2, 4, 6, 8, 10, 12, 14]) {
      (planner.querySelectorAll('tf-checkbox input')[i] as HTMLInputElement).click();
    }
    const size = planner.querySelector('#roundSize') as HTMLSelectElement;
    size.value = '8';
    size.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(planner.textContent).toContain('8 players - 1 game of 8 players');

    button('Start Round 2')?.click();
    await fixture.whenStable();
    stages = root.querySelectorAll('tf-bracket-stage');
    expect(stages.length).toBe(2);
    expect(stages[1].textContent).toContain('Round 2');
    expect(stages[1].querySelectorAll('.pick').length).toBe(8);

    (stages[1].querySelectorAll('.pick')[0] as HTMLElement).click();
    await fixture.whenStable();
    expect(root.querySelector('tf-next-round-planner')).not.toBeNull();
    expect(root.querySelector('tf-next-round-planner')?.textContent).toContain('Round 3');
    const winners = root.querySelector('.round-winners')?.textContent ?? '';
    expect(winners).toContain('Round 1');
    expect(winners).toContain('Round 2');

    button('Winners only')?.click();
    await fixture.whenStable();
    expect(root.querySelector('tf-next-round-planner')?.textContent).toContain(
      'Select at least 2 players.',
    );
    button('Same players again')?.click();
    await fixture.whenStable();
    expect(root.querySelector('tf-next-round-planner')?.textContent).toContain(
      '8 players - 1 game of 8 players.',
    );
    expect(saveForgeState).toHaveBeenCalled();
  });

  it('runs a mixed tournament one game per round and suggests the next game', async () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const entry = (game: string, format: string) => ({
      game,
      gameMode: '',
      format,
      gameSettings: {},
    });
    current = withMeta('t1', {
      title: 'Mix Night',
      game: 'Bingo + Ocho + Bounce',
      format: '15p',
      playersPerMatch: 15,
      slots: 15,
      mixed: [entry('Bingo', '15p'), entry('Ocho', '4p'), entry('Bounce', '8p')],
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() + 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      registrations: ids.map((platoId) => ({ platoId, registeredAt: 1 })),
      createdAt: 0,
      updatedAt: 0,
    });
    const fixture = TestBed.createComponent(ForgePage);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await fixture.whenStable();
    const button = (needle: string) =>
      Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(needle));

    button('Start Bracket')?.click();
    await fixture.whenStable();
    let stages = root.querySelectorAll('tf-bracket-stage');
    expect(stages[0].textContent).toContain('Round 1 · Bingo');
    (stages[0].querySelectorAll('.pick')[3] as HTMLElement).click();
    await fixture.whenStable();

    const planner = root.querySelector('tf-next-round-planner') as HTMLElement;
    const game = planner.querySelector('#roundGame') as HTMLSelectElement;
    expect(game.value).toBe('Ocho');
    expect(root.querySelector('tf-podium')).toBeNull();

    button('Winners only')?.click();
    button('Same players again')?.click();
    await fixture.whenStable();
    const size = planner.querySelector('#roundSize') as HTMLSelectElement;
    expect(size.value).toBe('4');
    expect(planner.textContent).toContain('15 players');

    button('Start Round 2')?.click();
    await fixture.whenStable();
    stages = root.querySelectorAll('tf-bracket-stage');
    expect(stages.length).toBe(2);
    expect(stages[1].textContent).toContain('Round 2 · Ocho');
    expect(root.querySelector('.round-winners')?.textContent).toContain('Round 1');
  });

  const organizerSession = { role: 'organizer', id: 'o1', displayName: 'Bella', loginAt: 1 };
  const finishedTournament = () =>
    withMeta('t1', {
      title: 'Cup',
      game: 'Carrom',
      slots: 8,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: Date.now() - 86_400_000,
      createdTZ: 'UTC',
      organizerId: 'o1',
      organizerName: 'Bella',
      completed: true,
      registrations: ['a', 'b', 'c', 'd'].map((platoId) => ({ platoId, registeredAt: 1 })),
      createdAt: 0,
      updatedAt: 0,
    });

  it('shows a finished tournament as view-only to its organizer', async () => {
    localStorage.setItem('tf_session_v1', JSON.stringify(organizerSession));
    try {
      current = finishedTournament();
      const fixture = TestBed.createComponent(ForgePage);
      const root = fixture.nativeElement as HTMLElement;
      await fixture.whenStable();
      await fixture.whenStable();

      expect(root.textContent).toContain('view-only for organizers');
      expect(root.textContent).toContain('contact Speedy');
      const labels = Array.from(root.querySelectorAll('button')).map((b) => b.textContent);
      expect(labels.some((l) => l?.includes('Start Bracket'))).toBe(false);
      expect(labels.some((l) => l?.includes('Add participant'))).toBe(false);
      expect(root.querySelector('.replace')).toBeNull();

      const store = fixture.debugElement.injector.get(ForgeStore);
      expect(store.viewOnly()).toBe(true);
      store.startBracket();
      expect(store.stages().length).toBe(0);
      expect(saveForgeState).not.toHaveBeenCalled();
    } finally {
      localStorage.removeItem('tf_session_v1');
    }
  });

  it('lets the admin keep working on a finished tournament', async () => {
    localStorage.setItem(
      'tf_session_v1',
      JSON.stringify({ role: 'admin', id: 'admin', displayName: 'Admin', loginAt: 1 }),
    );
    try {
      current = finishedTournament();
      const fixture = TestBed.createComponent(ForgePage);
      const root = fixture.nativeElement as HTMLElement;
      await fixture.whenStable();
      await fixture.whenStable();

      expect(root.textContent).not.toContain('view-only for organizers');
      const labels = Array.from(root.querySelectorAll('button')).map((b) => b.textContent);
      expect(labels.some((l) => l?.includes('Start Bracket'))).toBe(true);
      const store = fixture.debugElement.injector.get(ForgeStore);
      expect(store.viewOnly()).toBe(false);
      store.startBracket();
      expect(store.stages().length).toBe(1);
    } finally {
      localStorage.removeItem('tf_session_v1');
    }
  });

  describe('replaced participants', () => {
    const edited = (ids: string[], updatedAt: number, forgeStateUpdatedAt = 0) =>
      withMeta('t1', {
        ...tournament,
        registrations: ids.map((platoId) => ({ platoId, registeredAt: 1 })),
        updatedAt,
        forgeStateUpdatedAt,
      });

    const open = async () => {
      const fixture = TestBed.createComponent(ForgePage);
      await fixture.whenStable();
      return { fixture, store: fixture.debugElement.injector.get(ForgeStore) };
    };

    it('shows the new name on a page that was already open', async () => {
      const { store } = await open();
      store.startBracket();
      expect(store.stages()[0].matches.flatMap((m) => m.players)).toContain('a');
      await vi.waitFor(() => expect(store.hasPendingSaves).toBe(false));
      current = edited(['q', 'b', 'c', 'd'], 9, 9);
      await store.refreshIfChanged(0);
      expect(store.members()).toEqual(['q', 'b', 'c', 'd']);
    });

    it('keeps local choices when nothing changed elsewhere', async () => {
      const { store } = await open();
      store.perMatch.set(4);
      await store.refreshIfChanged(0);
      expect(store.perMatch()).toBe(4);
    });

    it('refuses a stale save, reloads and tells the user', async () => {
      const { store } = await open();
      const toast = TestBed.inject(ToastService);
      saveForgeState.mockResolvedValueOnce('conflict');
      current = edited(['q', 'b', 'c', 'd'], 9, 9);
      store.startBracket();
      await vi.waitFor(() => expect(toast.message()).toContain('changed elsewhere'));
      expect(store.members()).toEqual(['q', 'b', 'c', 'd']);
      expect(store.stages().length).toBe(0);
    });

    it('chains the save versions so its own saves never conflict', async () => {
      const { store } = await open();
      store.startBracket();
      store.pickWinner(0, 0, 0);
      await vi.waitFor(() => expect(saveForgeState).toHaveBeenCalledTimes(2));
      const [first, second] = saveForgeState.mock.calls.map((c) => c[3]);
      expect(second.expected).toBe(first.next);
    });

    it('carries a replaced name over in the next-round selection', async () => {
      current = edited(['p0', 'p1', 'p2'], 1);
      const { store } = await open();
      store.nextPlayers.set(['p0', 'p1', 'p2']);
      current = edited(['q0', 'p1', 'p2'], 9, 9);
      await store.refreshIfChanged(0);
      expect(store.nextPlayers()).toEqual(['q0', 'p1', 'p2']);
    });
  });
});
