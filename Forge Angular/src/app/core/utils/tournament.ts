import { DEFAULT_MEDAL, MEDALS, ONGOING_WINDOW_MS, STATUS_RANK } from '../config/constants';
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
    winners: data.winners || [],
    closingMessage: data.closingMessage || '',
    completed: !!data.completed,
    cancelled: !!data.cancelled,
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

export function isOpenForRegistration(t: Tournament): boolean {
  return t.status === 'upcoming' || t.status === 'ongoing';
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
