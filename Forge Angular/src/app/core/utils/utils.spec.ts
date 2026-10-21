import { BracketStage, Organizer } from '../models/models';
import {
  chunkText,
  currentStages,
  stageChunks,
  deserializeStages,
  replaceInForgeState,
  isStageComplete,
  nextStageLabel,
  groupUp,
  newStage,
  toggleWinner,
  tableSizes,
  fullTableTotals,
  roundWinnerLines,
  isMatchComplete,
  podiumFromSavedBracket,
  podiumFromStages,
  serializeStages,
  stageLabel,
  stageText,
  stageWinners,
} from './bracket';
import { formatPlatoId, normalizePlatoId, ordinal, parseParticipantList, teamLabel } from './plato';
import {
  canManage,
  capacityFor,
  computeStatus,
  findDuplicateRegistration,
  isOpenForRegistration,
  parsePrizes,
  podiumRows,
  registrationNotOpenYet,
  registrationState,
  timeUntil,
  usesFreeRounds,
  withPrizes,
  visibleOrganizers,
  withMeta,
} from './tournament';
import {
  findGame,
  GAME_CATALOG,
  playersPerTable,
  resolveFormat,
  suggestedSlots,
} from '../config/games';
import { computeLeaderboard, isAdvancing, scoringGames } from './scoring';
import {
  defaultCountdown,
  formatDuration,
  MESSAGE_TEMPLATES,
  renderMessage,
  slotsLeftText,
} from './messages';
import { estimateBytes, estimateDocBytes, formatBytes } from './size';
import { quotaLevel } from '../services/usage.service';
import {
  formatInTimezone,
  formatOffset,
  localPartsToUtc,
  timezoneOptionsAt,
  utcToLocalParts,
  zonedTimeToUtc,
} from './time';

describe('plato utils', () => {
  it('formats ids with a single leading @', () => {
    expect(formatPlatoId('Speedy')).toBe('@Speedy');
    expect(formatPlatoId('@@Speedy')).toBe('@Speedy');
    expect(formatPlatoId('Alice & @Bob')).toBe('@Alice & @Bob');
    expect(formatPlatoId('')).toBe('');
  });

  it('builds team labels and normalizes ids for comparison', () => {
    expect(teamLabel('Alice', 'Bob')).toBe('Alice & Bob');
    expect(teamLabel('Alice')).toBe('Alice');
    expect(normalizePlatoId(' @Alice ')).toBe('alice');
  });

  it('builds ordinals', () => {
    expect([1, 2, 3, 4, 11, 21].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '21st']);
  });
});

describe('time utils', () => {
  it('converts zoned wall time to UTC', () => {
    expect(zonedTimeToUtc(2026, 1, 15, 10, 0, 'Asia/Kolkata')).toBe(Date.UTC(2026, 0, 15, 4, 30));
    expect(zonedTimeToUtc(2026, 7, 15, 10, 0, 'America/New_York')).toBe(
      Date.UTC(2026, 6, 15, 14, 0),
    );
    expect(localPartsToUtc('2026-01-15', '10:00', 'UTC')).toBe(Date.UTC(2026, 0, 15, 10, 0));
  });

  it('round trips UTC to local date and time parts', () => {
    const utc = Date.UTC(2026, 0, 15, 4, 30);
    expect(utcToLocalParts(utc, 'Asia/Kolkata')).toEqual({ date: '2026-01-15', time: '10:00' });
  });

  it('formats times in a timezone', () => {
    expect(formatInTimezone(Date.UTC(2026, 0, 15, 4, 30), 'Asia/Kolkata')).toContain('10:00');
    expect(formatInTimezone(0, 'UTC')).toBe('');
  });
});

describe('tournament utils', () => {
  it('computes status', () => {
    const now = Date.now();
    expect(computeStatus({ startUTC: now + 3600_000 })).toBe('upcoming');
    expect(computeStatus({ startUTC: now - 3600_000 })).toBe('ongoing');
    expect(computeStatus({ startUTC: now - 10 * 3600_000 })).toBe('completed');
    expect(computeStatus({ startUTC: now + 3600_000, cancelled: true })).toBe('cancelled');
    expect(computeStatus({ startUTC: now + 3600_000, completed: true })).toBe('completed');
  });

  it('computes team capacity', () => {
    expect(capacityFor(32, 2)).toBe(16);
    expect(capacityFor(32, 1)).toBe(32);
  });

  it('checks management permissions', () => {
    const t = { organizerId: 'o1', managerIds: ['o2'] };
    expect(canManage({ role: 'admin', id: 'admin', displayName: 'A' }, t)).toBe(true);
    expect(canManage({ role: 'organizer', id: 'o1', displayName: 'A' }, t)).toBe(true);
    expect(canManage({ role: 'organizer', id: 'o2', displayName: 'A' }, t)).toBe(true);
    expect(canManage({ role: 'organizer', id: 'o3', displayName: 'A' }, t)).toBe(false);
    expect(canManage(null, t)).toBe(false);
  });

  it('builds podium rows sorted by place', () => {
    const rows = podiumRows([
      { place: 2, name: 'B' },
      { place: 1, name: 'A' },
    ]);
    expect(rows.map((r) => r.label)).toEqual(['1st Place', '2nd Place']);
    expect(rows[0].medal).toBe('🥇');
  });
});

describe('bracket utils', () => {
  it('pairs names and gives the odd one a bye', () => {
    const matches = groupUp(['a', 'b', 'c'], 2);
    expect(matches.length).toBe(2);
    const bye = matches.find((m) => m.players.length === 1);
    expect(bye?.winners).toEqual([0]);
  });

  it('labels stages', () => {
    expect(stageLabel(1)).toBe('Final Match');
    expect(nextStageLabel(8)).toBe('4 Match');
    expect(nextStageLabel(9, 9)).toBe('Final Match');
    expect(nextStageLabel(2)).toBe('Final Match');
  });

  const stages = (): BracketStage[] => [
    {
      label: 'Final Match',
      isThirdPlace: false,
      advance: 1,
      matches: [{ players: ['Alice', 'Bob'], winners: [1] }],
    },
    {
      label: '3rd Place Match',
      isThirdPlace: true,
      advance: 1,
      matches: [{ players: ['Cara', 'Dan'], winners: [0] }],
    },
  ];

  it('derives the podium', () => {
    expect(podiumFromStages(stages())).toEqual({
      champion: 'Bob',
      runnerUp: 'Alice',
      thirdPlace: 'Cara',
      fourthPlace: 'Dan',
    });
  });

  it('has no podium until the final is decided', () => {
    const s = stages();
    s[0].matches[0].winners = [];
    expect(podiumFromStages(s)).toBeNull();
  });

  it('round trips saved bracket state', () => {
    const saved = serializeStages(stages());
    expect(saved[0].matches[0]).toEqual({
      players: ['Alice', 'Bob'],
      winners: ['Bob'],
      p1Name: 'Alice',
      p2Name: 'Bob',
      winnerName: 'Bob',
    });
    expect(deserializeStages(saved)).toEqual(stages());
    expect(podiumFromSavedBracket({ thirdPlaceEnabled: true, stages: saved })?.champion).toBe(
      'Bob',
    );
    expect(podiumFromSavedBracket(null)).toBeNull();
  });

  it('summarizes stages', () => {
    const [final] = stages();
    expect(isStageComplete(final)).toBe(true);
    expect(stageWinners(final)).toEqual(['Bob']);
    expect(stageText(final)).toBe('Final Match\nMatch 1: @Alice vs @Bob -> Winner: @Bob');
  });
});

describe('replacement and visibility utils', () => {
  it('replaces a name across members, matches and winners', () => {
    const state = {
      members: ['Alice', 'Bob'],
      bracket: {
        thirdPlaceEnabled: true,
        stages: [
          {
            label: 'Final Match',
            isThirdPlace: false,
            matches: [{ p1Name: 'Alice', p2Name: 'Bob', winnerName: 'Alice' }],
          },
        ],
      },
    };
    const next = replaceInForgeState(state, '@alice', 'Zed');
    expect(next.members).toEqual(['Zed', 'Bob']);
    expect(next.bracket?.stages[0].matches[0]).toEqual({
      p1Name: 'Zed',
      p2Name: 'Bob',
      winnerName: 'Zed',
    });
  });

  it('detects duplicate registrations while ignoring the entry being edited', () => {
    const regs = [
      { platoId: 'A', partnerPlatoId: 'B', registeredAt: 1 },
      { platoId: 'C', partnerPlatoId: 'D', registeredAt: 1 },
    ];
    expect(findDuplicateRegistration(regs, 'b', 'X')).toBe(true);
    expect(findDuplicateRegistration(regs, 'A', 'E', 0)).toBe(false);
    expect(findDuplicateRegistration(regs, 'A', 'D', 0)).toBe(true);
  });

  it('shows only the pending stages as current matches', () => {
    const stage = (label: string, winner: 0 | null, isThirdPlace = false): BracketStage => ({
      label,
      isThirdPlace,
      advance: 1,
      matches: [{ players: ['a', 'b'], winners: winner === null ? [] : [winner] }],
    });
    expect(
      currentStages([stage('2 Match', 0), stage('3rd', null, true), stage('Final', null)]).length,
    ).toBe(2);
    expect(currentStages([stage('3rd', 0, true), stage('Final', 0)]).length).toBe(2);
  });

  it('limits organizers an organizer can assign to the ones they created', () => {
    const org = (id: string, createdBy?: string): Organizer => ({
      id,
      username: id,
      usernameLower: id,
      password: 'x',
      displayName: id,
      canManageOrganizers: false,
      createdBy,
      createdAt: 0,
    });
    const all = [org('o1', 'admin'), org('o2', 'o9'), org('o3')];
    expect(visibleOrganizers(all, { role: 'admin', id: 'admin', displayName: 'A' }).length).toBe(3);
    expect(
      visibleOrganizers(all, { role: 'organizer', id: 'o9', displayName: 'N' }).map((o) => o.id),
    ).toEqual(['o2']);
    expect(visibleOrganizers(all, null)).toEqual([]);
  });
});

describe('usage utils', () => {
  it('estimates sizes', () => {
    expect(estimateBytes('abc')).toBe(4);
    expect(estimateBytes({ a: true })).toBe(3);
    expect(estimateDocBytes('c', 'd', {})).toBe(1 + 1 + 1 + 1 + 0 + 32);
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('classifies quota levels', () => {
    expect(quotaLevel(10, 100)).toBe('ok');
    expect(quotaLevel(80, 100)).toBe('warn');
    expect(quotaLevel(100, 100)).toBe('full');
  });
});

describe('chat chunking', () => {
  it('packs whole items into chunks within the limit', () => {
    const names = Array.from({ length: 30 }, (_, i) => `@Player${i}`);
    const chunks = chunkText(names, ', ');
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(256));
    expect(chunks.join(', ').split(', ')).toEqual(names);
    expect(chunkText([], ', ')).toEqual([]);
  });

  it('keeps an oversized item whole in its own chunk', () => {
    expect(chunkText(['a'.repeat(300), 'b'], ', ').length).toBe(2);
  });

  it('prefixes match chunks with the stage label and part numbers', () => {
    const stage: BracketStage = {
      label: '8 Match',
      isThirdPlace: false,
      advance: 1,
      matches: Array.from({ length: 8 }, (_, i) => ({
        players: [`LongPlayerName${i}A`, `LongPlayerName${i}B`],
        winners: [],
      })),
    };
    const chunks = stageChunks(stage);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startsWith('8 Match (1/')).toBe(true);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(256));
    expect(chunks.join('\n')).toContain('Match 8:');
    const small = stageChunks({ ...stage, matches: stage.matches.slice(0, 2) });
    expect(small.length).toBe(1);
    expect(small[0].startsWith('8 Match\n')).toBe(true);
  });
});

describe('participant list parsing', () => {
  it('splits solo lists by lines and commas', () => {
    expect(parseParticipantList('A, B\nC;D\n\n', false).map((p) => p.platoId)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('reads one team per line', () => {
    expect(parseParticipantList('Alice & Bob\nCara + Dan\nSolo', true)).toEqual([
      { platoId: 'Alice', partnerPlatoId: 'Bob' },
      { platoId: 'Cara', partnerPlatoId: 'Dan' },
      { platoId: 'Solo', partnerPlatoId: '' },
    ]);
  });
});

describe('suggested messages', () => {
  const vars = {
    title: 'Carrom Cup',
    group: 'Plato Group',
    time: formatDuration(30, 'mins'),
    hosts: 'Speedy',
    slotsLeft: slotsLeftText(32, 30, false),
  };
  const find = (id: string) => MESSAGE_TEMPLATES.find((m) => m.id === id)!;

  it('fills in the tournament details', () => {
    const welcome = renderMessage(find('welcome'), vars);
    expect(welcome.text).toContain('Welcome to Plato Group!');
    expect(welcome.text).toContain('Carrom Cup');
    expect(renderMessage(find('get-ready'), vars).text).toContain('starts in 30 mins');
    expect(renderMessage(find('registration'), vars).text).toContain('Only 2 slots left!');
  });

  it('drops the group wording when there is no group', () => {
    const text = renderMessage(find('welcome'), { ...vars, group: '' }).text;
    expect(text.startsWith('Welcome to Carrom Cup!')).toBe(true);
  });

  it('keeps every template within 256 characters, shortening long names', () => {
    const long = { ...vars, title: 'T'.repeat(400), group: 'G'.repeat(300), hosts: 'H'.repeat(40) };
    MESSAGE_TEMPLATES.forEach((t) => {
      expect(renderMessage(t, vars).length).toBeLessThanOrEqual(256);
      expect(renderMessage(t, long).length).toBeLessThanOrEqual(256);
    });
    expect(renderMessage(find('welcome'), long).truncated).toBe(true);
  });

  it('formats durations and the default countdown', () => {
    expect(formatDuration(1, 'hours')).toBe('1 hour');
    expect(formatDuration(45, 'mins')).toBe('45 mins');
    const now = Date.now();
    expect(defaultCountdown(now + 90 * 60000, now)).toEqual({ amount: 90, unit: 'mins' });
    expect(defaultCountdown(now + 5 * 3600000, now)).toEqual({ amount: 5, unit: 'hours' });
    expect(defaultCountdown(now - 1000, now)).toEqual({ amount: 0, unit: 'mins' });
  });
});

describe('multi-player brackets', () => {
  const names = Array.from({ length: 18 }, (_, i) => `P${i}`);

  it('deals players evenly into tables', () => {
    const tables = groupUp(names, 9);
    expect(tables.map((t) => t.players.length)).toEqual([9, 9]);
    expect(
      groupUp(
        Array.from({ length: 10 }, (_, i) => `P${i}`),
        4,
      )
        .map((t) => t.players.length)
        .sort(),
    ).toEqual([3, 3, 4]);
  });

  it('only the last table before the final advances several players', () => {
    const first = newStage(names, 9, 3);
    expect(first.advance).toBe(3);
    expect(first.matches.length).toBe(2);
    const final = newStage(['a', 'b', 'c', 'd', 'e', 'f'], 9, 3);
    expect(final.matches.length).toBe(1);
    expect(final.advance).toBe(1);
    expect(final.label).toBe('Final Match');
  });

  it('lets any number of players advance from a table, and rank up to four at the final', () => {
    const stage = newStage(names, 9, 2);
    let match = stage.matches[0];
    expect(isMatchComplete(match, stage)).toBe(false);
    match = toggleWinner(match, 0, stage);
    expect(isMatchComplete(match, stage)).toBe(true);
    match = toggleWinner(match, 3, stage);
    match = toggleWinner(match, 5, stage);
    expect(match.winners).toEqual([0, 3, 5]);
    match = toggleWinner(match, 3, stage);
    expect(match.winners).toEqual([0, 5]);

    const final = newStage(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], 9, 4);
    let decided = toggleWinner(final.matches[0], 2, final);
    decided = toggleWinner(decided, 4, final);
    expect(decided.winners).toEqual([2, 4]);
    const two = toggleWinner(newStage(['a', 'b'], 2, 1).matches[0], 0, newStage(['a', 'b'], 2, 1));
    expect(toggleWinner(two, 1, newStage(['a', 'b'], 2, 1)).winners).toEqual([1]);
  });

  it('ranks up to four players at an N-player final in pick order', () => {
    const final = newStage(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], 9, 4);
    let match = final.matches[0];
    [4, 1, 7, 2, 0].forEach((i) => (match = toggleWinner(match, i, final)));
    expect(match.winners).toEqual([1, 7, 2, 0]);
    const p = match.players;
    expect(podiumFromStages([{ ...final, matches: [match] }])).toEqual({
      champion: p[1],
      runnerUp: p[7],
      thirdPlace: p[2],
      fourthPlace: p[0],
    });
    const only = toggleWinner(final.matches[0], 5, final);
    expect(isMatchComplete(only, final)).toBe(true);
    expect(podiumFromStages([{ ...final, matches: [only] }])?.runnerUp).toBeNull();
  });

  it('describes the next round tables', () => {
    expect(tableSizes(16, 9)).toEqual([8, 8]);
    expect(tableSizes(18, 9)).toEqual([9, 9]);
    expect(tableSizes(9, 9)).toEqual([9]);
    expect(fullTableTotals(16, 9)).toEqual([9, 18]);
    expect(fullTableTotals(18, 9)).toEqual([]);
    expect(fullTableTotals(16, 7)).toEqual([14, 21]);
  });

  it('reads old two-player saved matches and describes multi-player matches', () => {
    const [stage] = deserializeStages([
      {
        label: 'Final Match',
        isThirdPlace: false,
        matches: [{ p1Name: 'A', p2Name: 'B', winnerName: 'B' }],
      },
    ]);
    expect(stage.matches[0]).toEqual({ players: ['A', 'B'], winners: [1] });
    const text = stageText({
      label: '2 Match',
      isThirdPlace: false,
      advance: 2,
      matches: [{ players: ['A', 'B', 'C', 'D'], winners: [0, 2] }],
    });
    expect(text).toBe('2 Match\nMatch 1: @A vs @B vs @C vs @D -> Winners: @A, @C');
  });
});

describe('scoring', () => {
  it('awards points per side and ranks the leaderboard', () => {
    const scoring = {
      enabled: true,
      villagersWin: 2,
      villagersLose: 0,
      werewolvesWin: 3,
      werewolvesLose: 0,
      proPoints: 1,
      nabPoints: 1,
    };
    const games = [
      {
        id: 'g1',
        label: 'Game 1',
        players: ['A', 'B', 'C'],
        werewolves: ['C'],
        winner: 'villagers' as const,
      },
      {
        id: 'g2',
        label: 'Game 2',
        players: ['A', 'B', 'C'],
        werewolves: ['A'],
        winner: 'werewolves' as const,
      },
    ];
    const rows = computeLeaderboard(['A', 'B', 'C', 'D'], games, scoring);
    expect(rows.map((r) => [r.name, r.points])).toEqual([
      ['A', 5],
      ['B', 2],
      ['C', 0],
      ['D', 0],
    ]);
    expect(rows[0].wins).toBe(2);
  });
});

describe('suggested slots', () => {
  it('suggests a whole number of tables for every game format', () => {
    const slots = (game: string, id: string) => {
      const format = GAME_CATALOG.find((g) => g.name === game)!.formats.find((f) => f.id === id)!;
      return suggestedSlots(format, !!findGame(game)?.freeForAll);
    };
    expect(slots('Werewolf', '9p')).toBe(36);
    expect(slots('Werewolf', '7p')).toBe(28);
    expect(slots('Chess', '1v1')).toBe(32);
    expect(slots('Carrom', '2v2')).toBe(32);
    expect(slots('Ocho', '6p')).toBe(24);
    expect(slots('Bingo', '15p')).toBe(15);
    expect(slots('Bounce', '16p')).toBe(16);
    expect(slots('Bingo', '4p')).toBe(32);
    GAME_CATALOG.forEach((game) =>
      game.formats.forEach((format) => {
        const total = suggestedSlots(format, !!game.freeForAll);
        expect(total % playersPerTable(format)).toBe(0);
        expect(total).toBeGreaterThanOrEqual(playersPerTable(format));
      }),
    );
  });

  it('scores per-player outcomes and skips players without a result', () => {
    const scoring = {
      enabled: true,
      villagersWin: 2,
      villagersLose: 1,
      werewolvesWin: 5,
      werewolvesLose: 0,
      proPoints: 1,
      nabPoints: 1,
    };
    const game = {
      id: 'g',
      label: 'G',
      players: ['A', 'B', 'C', 'D'],
      werewolves: ['C'],
      outcomes: { A: true, B: false, C: false },
    };
    const rows = computeLeaderboard(['A', 'B', 'C', 'D'], [game], scoring);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect([
      byName['A'].points,
      byName['B'].points,
      byName['C'].points,
      byName['D'].points,
    ]).toEqual([2, 1, 0, 0]);
    expect(byName['D'].games).toBe(0);
    expect(byName['A'].wins).toBe(1);
  });

  it('only scores the players who advanced from the table', () => {
    const scoring = {
      enabled: true,
      villagersWin: 2,
      villagersLose: 1,
      werewolvesWin: 5,
      werewolvesLose: 0,
      proPoints: 1,
      nabPoints: 1,
    };
    const stages = [
      {
        label: '1 Match',
        isThirdPlace: false,
        advance: 1,
        matches: [{ players: ['A', 'B', 'C'], winners: [0, 2] }],
      },
    ];
    const game = {
      id: 'g',
      ref: '0:0',
      label: 'G',
      players: ['A', 'B', 'C'],
      werewolves: [],
      outcomes: { A: true, B: true, C: false },
    };
    const rows = computeLeaderboard(['A', 'B', 'C'], scoringGames([game], stages), scoring);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.points]));
    expect(byName).toEqual({ A: 2, B: 0, C: 1 });
    expect(isAdvancing(stages, '0:0', 'b')).toBe(false);
    const orphan = { ...game, ref: '3:1' };
    expect(computeLeaderboard(['A'], scoringGames([orphan], stages), scoring)[0].points).toBe(0);
    expect(isAdvancing(stages, '0:0', '@c')).toBe(true);
  });

  it('adds Pro points and deducts Nab points per game', () => {
    const scoring = {
      enabled: true,
      villagersWin: 2,
      villagersLose: 0,
      werewolvesWin: 3,
      werewolvesLose: 0,
      proPoints: 2,
      nabPoints: 3,
    };
    const game = {
      id: 'g',
      label: 'G',
      players: ['A', 'B', 'C'],
      werewolves: [],
      outcomes: { A: true, B: true, C: true },
      marks: { A: 'pro' as const, B: 'nab' as const },
    };
    const rows = computeLeaderboard(['A', 'B', 'C'], [game], scoring);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName['A'].points).toBe(4);
    expect(byName['B'].points).toBe(-1);
    expect(byName['C'].points).toBe(2);
    expect(byName['A'].pro).toBe(1);
    expect(byName['B'].nab).toBe(1);
  });

  it('always turns the points system on for Werewolf tournaments', () => {
    const base = {
      title: 'T',
      slots: 9,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: 0,
      createdTZ: 'UTC',
      organizerId: 'o',
      organizerName: 'O',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(withMeta('a', { ...base, game: 'Werewolf' }).scoring?.enabled).toBe(true);
    expect(withMeta('b', { ...base, game: 'Chess' }).scoring).toBeUndefined();
  });
});

describe('player count formats', () => {
  it('labels plain counts as players, not 1v1', () => {
    const bingo = findGame('Bingo')!;
    expect(bingo.formats.map((f) => f.label)).toEqual([
      '2 players',
      '4 players',
      '8 players',
      '15 players',
    ]);
    expect(findGame('Chess')!.formats.map((f) => f.label)).toEqual(['1v1']);
    expect(findGame('Pool')!.formats.map((f) => f.label)).toEqual(['1v1', '2v2 (teams of 2)']);
    expect(bingo.freeForAll).toBe(true);
    expect(findGame('Chess')!.freeForAll).toBe(false);
  });

  it('maps a legacy saved 1v1 format onto the current format list', () => {
    const bingo = findGame('Bingo')!;
    expect(resolveFormat(bingo, { format: '1v1', teamSize: 1, playersPerMatch: 2 }).id).toBe('2p');
    expect(resolveFormat(bingo, { format: '15p' }).id).toBe('15p');
    expect(resolveFormat(findGame('Carrom')!, { format: '2v2', teamSize: 2 }).id).toBe('2v2');
  });
});

describe('free-for-all rounds', () => {
  const players = Array.from({ length: 15 }, (_, i) => `P${i}`);

  it('has a single winner per table whatever the table size', () => {
    const stage = newStage(players, 15, 1, 1);
    expect(stage.label).toBe('Round 1');
    expect(stage.single).toBe(true);
    expect(stage.matches.length).toBe(1);
    expect(stage.matches[0].players.length).toBe(15);
    expect(isMatchComplete(stage.matches[0], stage)).toBe(false);
    let match = toggleWinner(stage.matches[0], 3, stage);
    match = toggleWinner(match, 7, stage);
    expect(match.winners).toEqual([7]);
    expect(isMatchComplete(match, stage)).toBe(true);
  });

  it('keeps single-winner rounds through saving and lists the round winners', () => {
    const first = newStage(players, 15, 1, 1);
    first.matches[0].winners = [2];
    const second = newStage(['P2', 'P5', 'P9', 'P11', 'P14', 'P0', 'P1', 'P3'], 8, 1, 2);
    second.matches[0].winners = [0];
    const stages = deserializeStages(serializeStages([first, second]));
    expect(stages.every((s) => s.single)).toBe(true);
    expect(stages[1].matches[0].players.length).toBe(8);
    expect(roundWinnerLines(stages)).toEqual([
      `🏆 Round 1: @${first.matches[0].players[2]}`,
      `🏆 Round 2: @${second.matches[0].players[0]}`,
    ]);
  });

  it('stores the game on mixed rounds and treats mixed tournaments as free rounds', () => {
    const stage = newStage(players, 15, 1, 1, 'Bingo');
    expect(stage.game).toBe('Bingo');
    expect(stage.label).toBe('Round 1 · Bingo');
    const [back] = deserializeStages(serializeStages([stage]));
    expect(back.game).toBe('Bingo');
    const entry = { game: 'Bingo', gameMode: '', format: '15p', gameSettings: {} };
    expect(usesFreeRounds({ game: 'Bingo + Ocho', mixed: [entry, entry] })).toBe(true);
    expect(usesFreeRounds({ game: 'Chess', mixed: [] })).toBe(false);
    expect(usesFreeRounds({ game: 'Bingo', mixed: [] })).toBe(true);
  });

  it('reads prizes per place from the announcement text', () => {
    const text = [
      '🏆 PRIZES',
      '🥇 1st — 20 Pips',
      '🥈 2nd — 10 Pips',
      '🥇 1st Prize: 4K Coins 💰',
      '💰 1st: 300 pips 👑',
      '🥉 3rd Place: 1K',
      'Winner takes it all',
    ].join('\n');
    expect([...parsePrizes(text)]).toEqual([
      [1, '20 Pips'],
      [2, '10 Pips'],
      [3, '1K'],
    ]);
    expect([...parsePrizes('🥇 1st Prize: 4K Coins 💰\n💰 1st: 300 pips 👑')]).toEqual([
      [1, '4K Coins'],
    ]);
    expect(
      withPrizes(
        [
          { place: 1, name: 'A' },
          { place: 2, name: 'B', prize: 'Gold' },
        ],
        {
          announcement: text,
          details: '',
        },
      ),
    ).toEqual([
      { place: 1, name: 'A', prize: '20 Pips' },
      { place: 2, name: 'B', prize: 'Gold' },
    ]);
  });

  it('lists Kuwait and shows each zone with its offset and current time', () => {
    const noon = Date.UTC(2026, 9, 21, 12, 0);
    const options = timezoneOptionsAt(noon);
    const label = (id: string) => options.find((o) => o.value === id)?.label;
    expect(label('Asia/Kuwait')).toBe('AST - Kuwait (UTC+3) · now 3:00 PM');
    expect(label('Asia/Kolkata')).toBe('IST - India (UTC+5:30) · now 5:30 PM');
    expect(label('America/New_York')).toBe('ET - US Eastern (UTC-4) · now 8:00 AM');
    expect(label('UTC')).toBe('UTC (UTC+0) · now 12:00 PM');
    expect(formatOffset(noon, 'Asia/Kuwait')).toBe('UTC+3');
  });

  it('knows when registration has not opened yet', () => {
    const now = Date.UTC(2026, 9, 21, 12, 0);
    const base = {
      title: 'T',
      game: 'Carrom',
      slots: 8,
      announcement: '',
      details: '',
      prizeText: '',
      sponsor: '',
      startUTC: now + 5 * 3600_000,
      createdTZ: 'UTC',
      organizerId: 'o',
      organizerName: 'O',
      createdAt: 0,
      updatedAt: 0,
    };
    const open = withMeta('a', base);
    expect(open.registrationOpensAt).toBe(0);
    expect(registrationNotOpenYet(open, now)).toBe(false);
    expect(isOpenForRegistration(open, now)).toBe(true);

    const later = withMeta('b', { ...base, registrationOpensAt: now + 3600_000 });
    expect(registrationNotOpenYet(later, now)).toBe(true);
    expect(isOpenForRegistration(later, now)).toBe(false);
    expect(isOpenForRegistration(later, now + 3600_000)).toBe(true);
    expect(registrationState(later, now)).toBe('soon');
    expect(registrationState(withMeta('s', { ...base, registrationSoon: true }), now)).toBe('soon');
    expect(registrationState(open, now)).toBe('open');
    expect(registrationState(withMeta('c', { ...base, registrationClosed: true }), now)).toBe(
      'closed',
    );
    expect(registrationState(withMeta('d', { ...base, completed: true }), now)).toBe('ended');
  });

  it('describes how long until registration opens', () => {
    const now = 0;
    expect(timeUntil(30 * 1000, now)).toBe('1 min');
    expect(timeUntil(45 * 60000, now)).toBe('45 min');
    expect(timeUntil(135 * 60000, now)).toBe('2h 15m');
    expect(timeUntil(72 * 3600_000, now)).toBe('3 days');
  });
});
