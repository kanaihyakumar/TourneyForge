import {
  BracketStage,
  LeaderboardRow,
  PlayerCategory,
  ScoreGame,
  ScoringConfig,
  WerewolfSide,
} from '../models/models';
import { normalizePlatoId } from './plato';

export const DEFAULT_SCORING: ScoringConfig = {
  enabled: false,
  villagersWin: 2,
  villagersLose: 0,
  werewolvesWin: 3,
  werewolvesLose: 0,
  proPoints: 1,
  nabPoints: 1,
};

export function sideOf(game: ScoreGame, name: string): WerewolfSide {
  const key = normalizePlatoId(name);
  return game.werewolves.some((w) => normalizePlatoId(w) === key) ? 'werewolves' : 'villagers';
}

export function resultOf(
  game: ScoreGame,
  name: string,
): { side: WerewolfSide; won: boolean } | null {
  const side = sideOf(game, name);
  if (game.outcomes) {
    const key = Object.keys(game.outcomes).find(
      (k) => normalizePlatoId(k) === normalizePlatoId(name),
    );
    return key === undefined ? null : { side, won: game.outcomes[key] };
  }
  return game.winner ? { side, won: game.winner === side } : null;
}

export function markOf(game: ScoreGame, name: string): PlayerCategory | null {
  if (!game.marks) return null;
  const key = Object.keys(game.marks).find((k) => normalizePlatoId(k) === normalizePlatoId(name));
  return key === undefined ? null : game.marks[key];
}

export function pointsFor(game: ScoreGame, name: string, scoring: ScoringConfig): number {
  const result = resultOf(game, name);
  let points = 0;
  if (result) {
    if (result.side === 'werewolves') {
      points = result.won ? scoring.werewolvesWin : scoring.werewolvesLose;
    } else {
      points = result.won ? scoring.villagersWin : scoring.villagersLose;
    }
  }
  const mark = markOf(game, name);
  if (mark === 'pro') points += scoring.proPoints;
  if (mark === 'nab') points -= scoring.nabPoints;
  return points;
}

export function standingDetail(row: LeaderboardRow): string {
  return `${row.points} pts`;
}

export function computeLeaderboard(
  members: string[],
  games: ScoreGame[],
  scoring: ScoringConfig,
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>();
  const ensure = (name: string): LeaderboardRow => {
    const key = normalizePlatoId(name);
    let row = rows.get(key);
    if (!row) {
      row = { name, games: 0, wins: 0, points: 0, pro: 0, nab: 0 };
      rows.set(key, row);
    }
    return row;
  };
  members.forEach(ensure);
  games.forEach((game) =>
    game.players.forEach((player) => {
      const result = resultOf(game, player);
      const mark = markOf(game, player);
      if (!result && !mark) return;
      const row = ensure(player);
      if (result) {
        row.games += 1;
        if (result.won) row.wins += 1;
      }
      if (mark === 'pro') row.pro += 1;
      if (mark === 'nab') row.nab += 1;
      row.points += pointsFor(game, player, scoring);
    }),
  );
  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name),
  );
}

export function matchNames(
  input: string[],
  members: string[],
): { matched: string[]; unmatched: string[] } {
  const matched = new Set<string>();
  const unmatched: string[] = [];
  input.forEach((raw) => {
    const key = normalizePlatoId(raw);
    if (!key) return;
    const exact = members.filter((m) => normalizePlatoId(m) === key);
    const starts = members.filter((m) => normalizePlatoId(m).startsWith(key));
    const contains = members.filter((m) => normalizePlatoId(m).includes(key));
    const hit =
      exact[0] ?? (starts.length === 1 ? starts[0] : contains.length === 1 ? contains[0] : null);
    if (hit) matched.add(hit);
    else unmatched.push(raw.trim());
  });
  return { matched: [...matched], unmatched };
}

const BRACKET_REF = /^\d+:\d+$/;

export function scoringGames(games: ScoreGame[], stages: BracketStage[]): ScoreGame[] {
  return games.map((game) => {
    if (!game.ref || !BRACKET_REF.test(game.ref)) return game;
    const match = findMatch(stages, game.ref);
    if (!match) return { ...game, players: [] };
    const advancing = match.winners.map((i) => match.players[i]).filter(Boolean);
    const keys = new Set(advancing.map(normalizePlatoId));
    return { ...game, players: game.players.filter((p) => keys.has(normalizePlatoId(p))) };
  });
}

function findMatch(stages: BracketStage[], ref: string) {
  const [stageIndex, matchIndex] = ref.split(':').map(Number);
  return stages[stageIndex]?.matches[matchIndex] ?? null;
}

export function isAdvancing(stages: BracketStage[], ref: string, name: string): boolean {
  const match = findMatch(stages, ref);
  if (!match) return false;
  return match.winners.some(
    (i) => normalizePlatoId(match.players[i] ?? '') === normalizePlatoId(name),
  );
}
