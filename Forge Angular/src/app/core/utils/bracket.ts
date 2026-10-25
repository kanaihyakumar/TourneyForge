import {
  BracketMatch,
  BracketStage,
  ForgeState,
  Podium,
  SavedBracket,
  SavedMatch,
  SavedStage,
} from '../models/models';
import { formatPlatoId, normalizePlatoId } from './plato';

export const CHAT_LIMIT = 256;

export function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function groupUp(names: string[], perMatch: number): BracketMatch[] {
  const size = Math.max(2, perMatch);
  const tables = Math.max(1, Math.ceil(names.length / size));
  const groups: string[][] = Array.from({ length: tables }, () => []);
  shuffle(names).forEach((name, i) => groups[i % tables].push(name));
  return groups
    .filter((players) => players.length)
    .map((players) => ({ players, winners: players.length === 1 ? [0] : [] }));
}

export function stageLabel(matchCount: number): string {
  return matchCount === 1 ? 'Final Match' : matchCount + ' Match';
}

export function clampAdvance(advance: number, perMatch: number): number {
  return Math.min(Math.max(1, Math.floor(advance) || 1), Math.max(1, perMatch - 1));
}

export function newStage(
  names: string[],
  perMatch: number,
  advance: number,
  round = 0,
  game = '',
): BracketStage {
  const matches = groupUp(names, perMatch);
  if (round > 0) {
    return {
      label: game ? `Round ${round} · ${game}` : `Round ${round}`,
      isThirdPlace: false,
      advance: 1,
      perMatch,
      single: true,
      ...(game ? { game } : {}),
      matches,
    };
  }
  const isFinal = matches.length === 1;
  return {
    label: stageLabel(matches.length),
    isThirdPlace: false,
    advance: isFinal ? 1 : clampAdvance(advance, perMatch),
    perMatch,
    matches,
  };
}

export function nextStageLabel(names: number, perMatch = 2): string {
  return stageLabel(Math.max(1, Math.ceil(names / Math.max(2, perMatch))));
}

type StageShape = { isThirdPlace: boolean; matches: unknown[]; single?: boolean };

export function isFinalStage(stage: StageShape): boolean {
  return !stage.isThirdPlace && !stage.single && stage.matches.length === 1;
}

export function winnerLimits(match: BracketMatch, stage: StageShape): { min: number; max: number } {
  if (match.players.length <= 2 || stage.single) return { min: 1, max: 1 };
  if (isFinalStage(stage)) return { min: 1, max: Math.min(4, match.players.length) };
  return { min: 1, max: match.players.length - 1 };
}

export function isMatchComplete(match: BracketMatch, stage: StageShape): boolean {
  const { min, max } = winnerLimits(match, stage);
  return match.winners.length >= min && match.winners.length <= max;
}

export function isStageComplete(stage: BracketStage): boolean {
  return stage.matches.every((m) => isMatchComplete(m, stage));
}

export function matchWinnerNames(match: BracketMatch): string[] {
  return match.winners.map((i) => match.players[i]).filter((n): n is string => !!n);
}

export function matchLoserNames(match: BracketMatch): string[] {
  return match.players.filter((_, i) => !match.winners.includes(i));
}

export function stageWinners(stage: BracketStage): string[] {
  return stage.matches.flatMap(matchWinnerNames);
}

export function stageLosers(stage: BracketStage): string[] {
  return stage.matches
    .filter((m) => m.players.length === 2 && m.winners.length)
    .flatMap(matchLoserNames);
}

export function stageNames(stage: BracketStage): string[] {
  return stage.matches.flatMap((m) => m.players);
}

export function hasPickedWinners(stage: BracketStage): boolean {
  return stage.matches.some((m) => m.players.length > 1 && m.winners.length > 0);
}

export function toggleWinner(match: BracketMatch, index: number, stage: StageShape): BracketMatch {
  if (match.players.length <= 1) return match;
  const { max } = winnerLimits(match, stage);
  const has = match.winners.includes(index);
  if (max === 1) return { ...match, winners: has ? [] : [index] };
  const next = has ? match.winners.filter((w) => w !== index) : [...match.winners, index];
  return { ...match, winners: next.slice(-max) };
}

export function tableSizes(count: number, perMatch: number): number[] {
  const tables = Math.max(1, Math.ceil(count / Math.max(2, perMatch)));
  const base = Math.floor(count / tables);
  const extra = count % tables;
  return Array.from({ length: tables }, (_, i) => base + (i < extra ? 1 : 0));
}

export function fullTableTotals(count: number, perMatch: number): number[] {
  const lower = Math.floor(count / perMatch) * perMatch;
  const upper = Math.ceil(count / perMatch) * perMatch;
  return [lower, upper].filter((n, i, all) => n > 0 && n !== count && all.indexOf(n) === i);
}

export function podiumFromStages(stages: BracketStage[]): Podium | null {
  const finalStage = stages.filter((s) => !s.isThirdPlace && s.matches.length === 1).pop();
  const thirdStage = stages.find((s) => s.isThirdPlace);
  const finalMatch = finalStage?.matches[0];
  if (!finalMatch || !finalMatch.winners.length) return null;
  const thirdMatch = thirdStage?.matches[0];
  const hasThird = !!thirdMatch && thirdMatch.winners.length > 0;
  return {
    champion: matchWinnerNames(finalMatch)[0] ?? null,
    runnerUp:
      finalMatch.players.length === 2
        ? (matchLoserNames(finalMatch)[0] ?? null)
        : (matchWinnerNames(finalMatch)[1] ?? null),
    thirdPlace: hasThird
      ? (matchWinnerNames(thirdMatch)[0] ?? null)
      : (matchWinnerNames(finalMatch)[2] ?? null),
    fourthPlace: hasThird
      ? (matchLoserNames(thirdMatch)[0] ?? null)
      : (matchWinnerNames(finalMatch)[3] ?? null),
  };
}

function serializeMatch(match: BracketMatch): SavedMatch {
  const winners = matchWinnerNames(match);
  const saved: SavedMatch = { players: match.players, winners };
  if (match.players.length <= 2) {
    saved.p1Name = match.players[0] ?? null;
    saved.p2Name = match.players[1] ?? null;
    saved.winnerName = winners[0] ?? null;
  }
  return saved;
}

function deserializeMatch(saved: SavedMatch): BracketMatch {
  const players = saved.players ?? [saved.p1Name, saved.p2Name].filter((n): n is string => !!n);
  const winnerNames = saved.winners ?? (saved.winnerName ? [saved.winnerName] : []);
  const winners = winnerNames.map((name) => players.indexOf(name)).filter((i) => i >= 0);
  return { players, winners };
}

export function serializeStages(stages: BracketStage[]): SavedStage[] {
  return stages.map((s) => ({
    label: s.label,
    isThirdPlace: s.isThirdPlace,
    advance: s.advance,
    perMatch: s.perMatch,
    ...(s.single ? { single: true } : {}),
    ...(s.game ? { game: s.game } : {}),
    matches: s.matches.map(serializeMatch),
  }));
}

export function deserializeStages(stages: SavedStage[]): BracketStage[] {
  return stages.map((s) => ({
    label: s.label,
    isThirdPlace: !!s.isThirdPlace,
    advance: s.advance ?? 1,
    perMatch: s.perMatch,
    ...(s.single ? { single: true } : {}),
    ...(s.game ? { game: s.game } : {}),
    matches: s.matches.map(deserializeMatch),
  }));
}

export function podiumFromSavedBracket(bracket: SavedBracket | null | undefined): Podium | null {
  if (!bracket || !Array.isArray(bracket.stages)) return null;
  return podiumFromStages(deserializeStages(bracket.stages));
}

export interface ForgeExtras {
  perMatch: number;
  advance: number;
  games?: ForgeState['games'];
}

export function buildForgeState(
  members: string[],
  stages: BracketStage[],
  thirdPlaceEnabled: boolean,
  extras: ForgeExtras,
): ForgeState {
  const state: ForgeState = {
    members,
    bracket: stages.length
      ? {
          thirdPlaceEnabled,
          perMatch: extras.perMatch,
          advance: extras.advance,
          stages: serializeStages(stages),
        }
      : null,
  };
  if (extras.games?.length) state.games = extras.games;
  return state;
}

export function matchInvolves(match: BracketMatch, query: string): boolean {
  const needle = normalizePlatoId(query);
  if (!needle) return true;
  return match.players.some((name) => normalizePlatoId(name).includes(needle));
}

export function matchLine(match: BracketMatch, index: number): string {
  const prefix = `Match ${index + 1}: `;
  const names = match.players.map(formatPlatoId);
  if (names.length <= 1) return `${prefix}${names[0] ?? '?'} - BYE (auto-advances)`;
  const winners = matchWinnerNames(match).map(formatPlatoId);
  const versus = names.join(' vs ');
  if (!winners.length) return `${prefix}${versus}`;
  return `${prefix}${versus} -> ${winners.length > 1 ? 'Winners' : 'Winner'}: ${winners.join(', ')}`;
}

export function stageText(stage: BracketStage): string {
  return [stage.label, ...stage.matches.map(matchLine)].join('\n');
}

export function chunkText(
  items: string[],
  separator: string,
  header = '',
  limit = CHAT_LIMIT,
): string[] {
  const available = header ? limit - header.length - ' (99/99)'.length - 1 : limit;
  const parts: string[] = [];
  let current = '';
  for (const item of items) {
    const candidate = current ? current + separator + item : item;
    if (!current || candidate.length <= available) {
      current = candidate;
    } else {
      parts.push(current);
      current = item;
    }
  }
  if (current) parts.push(current);
  if (!header) return parts;
  return parts.map((part, i) =>
    parts.length === 1 ? `${header}\n${part}` : `${header} (${i + 1}/${parts.length})\n${part}`,
  );
}

export function stageChunks(stage: BracketStage): string[] {
  return chunkText(stage.matches.map(matchLine), '\n', stage.label);
}

export function currentStages(stages: BracketStage[]): BracketStage[] {
  const pending = stages.filter((s) => !isStageComplete(s));
  if (pending.length) return pending;
  const last = stages.at(-1);
  return stages.filter((s) => s === last || s.isThirdPlace);
}

export function replaceInForgeState(
  state: ForgeState,
  oldLabel: string,
  newLabel: string,
): ForgeState {
  const same = (name: string) => normalizePlatoId(name) === normalizePlatoId(oldLabel);
  const swap = (name: string | null | undefined): string | null =>
    name == null ? null : same(name) ? newLabel : name;
  const swapAll = (names: string[] | undefined) => names?.map((n) => swap(n) as string);
  const next: ForgeState = {
    members: state.members.map((m) => swap(m) as string),
    bracket: state.bracket && {
      ...state.bracket,
      stages: state.bracket.stages.map((s) => ({
        ...s,
        matches: s.matches.map((m) => ({
          ...m,
          p1Name: m.p1Name === undefined ? undefined : swap(m.p1Name),
          p2Name: m.p2Name === undefined ? undefined : swap(m.p2Name),
          winnerName: m.winnerName === undefined ? undefined : swap(m.winnerName),
          players: swapAll(m.players),
          winners: swapAll(m.winners),
        })),
      })),
    },
  };
  if (state.games) {
    next.games = state.games.map((g) => ({
      ...g,
      players: swapAll(g.players) ?? [],
      werewolves: swapAll(g.werewolves) ?? [],
      outcomes: g.outcomes
        ? Object.fromEntries(
            Object.entries(g.outcomes).map(([n, won]) => [same(n) ? newLabel : n, won]),
          )
        : undefined,
      marks: g.marks
        ? Object.fromEntries(
            Object.entries(g.marks).map(([n, mark]) => [same(n) ? newLabel : n, mark]),
          )
        : undefined,
    }));
  }
  return next;
}

export function roundWinnerLines(stages: BracketStage[]): string[] {
  return stages
    .filter((s) => s.single)
    .flatMap((stage) =>
      stage.matches
        .map((match, index) => ({ match, index }))
        .filter(({ match }) => match.winners.length > 0)
        .map(({ match, index }) => {
          const where =
            stage.matches.length > 1 ? `${stage.label} · Game ${index + 1}` : stage.label;
          return `🏆 ${where}: ${formatPlatoId(matchWinnerNames(match)[0] ?? '')}`;
        }),
    );
}
