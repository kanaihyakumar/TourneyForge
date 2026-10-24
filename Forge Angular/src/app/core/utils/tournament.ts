import {
  DEFAULT_MEDAL,
  MEDALS,
  ONGOING_WINDOW_MS,
  REG_KEY_LENGTH,
  STATUS_RANK,
} from '../config/constants';
import {
  Organizer,
  Podium,
  PodiumRow,
  Registration,
  Session,
  TeamSize,
  Tournament,
  TournamentData,
  TournamentStatus,
  Winner,
} from '../models/models';
import { findGame } from '../config/games';
import { DEFAULT_SCORING } from './scoring';
import { normalizePlatoId, ordinal, teamLabel } from './plato';

export function computeStatus(t: {
  cancelled?: boolean;
  completed?: boolean;
  startUTC: number;
}): TournamentStatus {
  if (t.cancelled) return 'cancelled';
  if (t.completed) return 'completed';
  const now = Date.now();
  if (now < t.startUTC) return 'upcoming';
  if (now < t.startUTC + ONGOING_WINDOW_MS) return 'ongoing';
  return 'completed';
}

export function capacityFor(slots: number, teamSize: number): number {
  return teamSize === 2 ? Math.floor((slots || 0) / 2) : slots || 0;
}

export function withMeta(id: string, data: TournamentData): Tournament {
  const registrations = data.registrations || [];
  const teamSize: TeamSize = data.teamSize === 2 ? 2 : 1;
  return {
    ...data,
    id,
    status: computeStatus(data),
    registrations,
    registeredCount: registrations.length,
    hosts: data.hosts || [],
    managerIds: data.managerIds || [],
    winners: withPrizes(data.winners || [], data),
    closingMessage: data.closingMessage || '',
    completed: !!data.completed,
    cancelled: !!data.cancelled,
    locked: data.locked !== false,
    registrationOpensAt: Number(data.registrationOpensAt) || 0,
    registrationClosed: !!data.registrationClosed,
    registrationSoon: !!data.registrationSoon,
    keyRequired: !!data.keyRequired,
    teamSize,
    gameMode: data.gameMode ?? '',
    format: data.format ?? (teamSize === 2 ? '2v2' : '1v1'),
    playersPerMatch: data.playersPerMatch ?? 2,
    gameSettings: data.gameSettings ?? {},
    mixed: data.mixed ?? [],
    ...(findGame(data.game)?.scoring
      ? { scoring: { ...DEFAULT_SCORING, ...data.scoring, enabled: true } }
      : {}),
    teamCapacity: capacityFor(data.slots, teamSize),
  };
}

const PLACE_TOKENS: [number, RegExp][] = [
  [1, /^(🥇|1st|first)$/iu],
  [2, /^(🥈|2nd|second)$/iu],
  [3, /^(🥉|3rd|third)$/iu],
  [4, /^(4\uFE0F?\u20E3|4th|fourth)$/iu],
];
const LINE_START =
  /^[^\p{L}\p{N}]*(🥇|🥈|🥉|4\uFE0F?\u20E3|1st|2nd|3rd|4th|first|second|third|fourth)/iu;
const PLACE_WORDS =
  /🥇|🥈|🥉|4\uFE0F?\u20E3|\b(1st|2nd|3rd|4th|first|second|third|fourth|place|prize|winner)\b/giu;

export function parsePrizes(text: string): Map<number, string> {
  const prizes = new Map<number, string>();
  for (const line of text.split('\n')) {
    const start = LINE_START.exec(line);
    if (!start) continue;
    const place = PLACE_TOKENS.find(([, re]) => re.test(start[1]))?.[0];
    if (!place || prizes.has(place)) continue;
    const prize = line
      .replace(PLACE_WORDS, '')
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .replace(/[^\p{L}\p{N}.)%+]+$/u, '')
      .trim();
    if (/\d/.test(prize)) prizes.set(place, prize);
  }
  return prizes;
}

export function withPrizes(
  winners: Winner[],
  source: Pick<TournamentData, 'announcement' | 'details'> & { prizeText?: string },
): Winner[] {
  if (!winners.some((w) => !w.prize)) return winners;
  const parsed = parsePrizes(
    [source.prizeText, source.announcement, source.details].filter(Boolean).join('\n'),
  );
  return winners.map((w) => {
    const prize = w.prize || parsed.get(w.place);
    return prize ? { ...w, prize } : w;
  });
}

export function sortTournaments(list: Tournament[]): Tournament[] {
  return [...list].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.startUTC - b.startUTC,
  );
}

export function canManage(
  session: Session | null,
  tournament: { organizerId: string; managerIds?: string[] } | null,
): boolean {
  if (!session || !tournament) return false;
  if (session.role === 'admin') return true;
  if (session.role !== 'organizer') return false;
  if (tournament.organizerId === session.id) return true;
  return (tournament.managerIds || []).includes(session.id);
}

export function registrationNotOpenYet(
  t: Pick<Tournament, 'registrationOpensAt' | 'registrationSoon'>,
  now = Date.now(),
): boolean {
  return t.registrationSoon || t.registrationOpensAt > now;
}

export function randomRegistrationKey(): string {
  const low = 10 ** (REG_KEY_LENGTH - 1);
  const span = 9 * low;
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(low + (bytes[0] % span));
}

export function normalizeRegistrationKey(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export type RegistrationState = 'ended' | 'closed' | 'soon' | 'open';

export function registrationState(t: Tournament, now = Date.now()): RegistrationState {
  if (t.status === 'completed' || t.status === 'cancelled') return 'ended';
  if (t.registrationClosed) return 'closed';
  return registrationNotOpenYet(t, now) ? 'soon' : 'open';
}

export function isFinished(
  t: { completed?: boolean; cancelled?: boolean } | null | undefined,
): boolean {
  return !!t && !!(t.completed || t.cancelled);
}

export function isViewOnlyFor(
  session: Session | null,
  t: { completed?: boolean; cancelled?: boolean } | null | undefined,
): boolean {
  return isFinished(t) && session?.role !== 'admin';
}

export function isOpenForRegistration(t: Tournament, now = Date.now()): boolean {
  return registrationState(t, now) === 'open';
}

export function timeUntil(targetUTC: number, now = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((targetUTC - now) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)} days`;
}

export function isFull(t: Tournament): boolean {
  return !!t.teamCapacity && t.registeredCount >= t.teamCapacity;
}

export function registrationLabel(r: Registration, teamSize: number): string {
  return teamSize === 2 ? teamLabel(r.platoId, r.partnerPlatoId) : r.platoId;
}

export function cleanList(list: unknown): string[] {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

export function cleanWinners(list: unknown): Winner[] {
  return Array.isArray(list) ? list.filter((w: Winner) => w && w.name) : [];
}

export function podiumRows(winners: Winner[]): PodiumRow[] {
  return [...winners]
    .sort((a, b) => a.place - b.place)
    .map((w) => ({
      medal: MEDALS[w.place] || DEFAULT_MEDAL,
      label: ordinal(w.place) + ' Place',
      name: w.name,
      detail: w.detail,
      prize: w.prize,
    }));
}

export function winnersFromPodium(podium: Podium): Winner[] {
  const entries: [number, string | null][] = [
    [1, podium.champion],
    [2, podium.runnerUp],
    [3, podium.thirdPlace],
    [4, podium.fourthPlace],
  ];
  return entries
    .filter((e): e is [number, string] => !!e[1])
    .map(([place, name]) => ({ place, name }));
}

export function findDuplicateRegistration(
  registrations: Registration[],
  platoId: string,
  partnerPlatoId: string,
  ignoreIndex = -1,
): boolean {
  const own = normalizePlatoId(platoId);
  const partner = normalizePlatoId(partnerPlatoId);
  return registrations.some((r, i) => {
    if (i === ignoreIndex) return false;
    const rPlato = normalizePlatoId(r.platoId);
    const rPartner = normalizePlatoId(r.partnerPlatoId);
    return (
      rPlato === own ||
      (!!partner && rPlato === partner) ||
      (!!rPartner && rPartner === own) ||
      (!!partner && !!rPartner && rPartner === partner)
    );
  });
}

export function visibleOrganizers(organizers: Organizer[], session: Session | null): Organizer[] {
  if (!session) return [];
  if (session.role === 'admin') return organizers;
  return organizers.filter((o) => o.createdBy === session.id);
}

export function formatLabelFor(
  t: Pick<Tournament, 'game' | 'format' | 'teamSize' | 'playersPerMatch'>,
): string {
  const label = findGame(t.game)?.formats.find((f) => f.id === t.format)?.label;
  return (
    label ??
    (t.teamSize === 2 ? '2v2' : t.playersPerMatch > 2 ? `${t.playersPerMatch} players` : '1v1')
  );
}

export function usesFreeRounds(t: Pick<Tournament, 'game' | 'mixed'>): boolean {
  return (t.mixed?.length ?? 0) > 1 || !!findGame(t.game)?.freeForAll;
}
