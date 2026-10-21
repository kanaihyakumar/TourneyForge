export type Role = 'admin' | 'organizer';

export interface Session {
  role: Role;
  id: string;
  displayName: string;
  canManageOrganizers?: boolean;
}

export type TournamentStatus = 'ongoing' | 'upcoming' | 'completed' | 'cancelled';
export type TeamSize = 1 | 2;
export type PlayerCategory = 'pro' | 'nab';
export type WerewolfSide = 'villagers' | 'werewolves';

export interface MixedGameEntry {
  game: string;
  gameMode: string;
  format: string;
  gameSettings: Record<string, string>;
}

export interface Winner {
  place: number;
  name: string;
  detail?: string;
  prize?: string;
}

export interface Registration {
  platoId: string;
  partnerPlatoId?: string;
  registeredAt: number;
}

export interface SavedMatch {
  p1Name?: string | null;
  p2Name?: string | null;
  winnerName?: string | null;
  players?: string[];
  winners?: string[];
}

export interface SavedStage {
  label: string;
  isThirdPlace: boolean;
  advance?: number;
  perMatch?: number;
  single?: boolean;
  game?: string;
  matches: SavedMatch[];
}

export interface SavedBracket {
  thirdPlaceEnabled: boolean;
  perMatch?: number;
  advance?: number;
  stages: SavedStage[];
}

export interface ScoreGame {
  id: string;
  ref?: string;
  label: string;
  players: string[];
  werewolves: string[];
  winner?: WerewolfSide;
  outcomes?: Record<string, boolean>;
  marks?: Record<string, PlayerCategory>;
}

export interface ForgeState {
  members: string[];
  bracket: SavedBracket | null;
  games?: ScoreGame[];
}

export interface BracketMatch {
  players: string[];
  winners: number[];
}

export interface BracketStage {
  label: string;
  isThirdPlace: boolean;
  advance: number;
  perMatch?: number;
  single?: boolean;
  game?: string;
  matches: BracketMatch[];
}

export interface ScoringConfig {
  enabled: boolean;
  villagersWin: number;
  villagersLose: number;
  werewolvesWin: number;
  werewolvesLose: number;
  proPoints: number;
  nabPoints: number;
}

export interface LeaderboardRow {
  name: string;
  games: number;
  pro: number;
  nab: number;
  wins: number;
  points: number;
}

export interface Podium {
  champion: string | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  fourthPlace: string | null;
}

export interface PodiumRow {
  medal: string;
  label: string;
  name: string;
  detail?: string;
  prize?: string;
}

export interface TournamentInput {
  title: string;
  groupName?: string;
  game: string;
  slots: number | string;
  teamSize: number | string;
  gameMode?: string;
  format?: string;
  playersPerMatch?: number;
  gameSettings?: Record<string, string>;
  mixed?: MixedGameEntry[];
  scoring?: ScoringConfig;
  announcement: string;
  details: string;
  prizeText?: string;
  sponsor: string;
  closingMessage: string;
  winners: Winner[];
  hosts: string[];
  startUTC: number;
  createdTZ: string;
  registrationOpensAt?: number;
  managerIds?: string[];
}

export interface TournamentUpdate extends Partial<TournamentInput> {
  cancelled?: boolean;
  completed?: boolean;
  locked?: boolean;
  registrationClosed?: boolean;
  registrationSoon?: boolean;
}

export interface TournamentData {
  title: string;
  groupName?: string;
  game: string;
  slots: number;
  teamSize?: number;
  gameMode?: string;
  format?: string;
  playersPerMatch?: number;
  gameSettings?: Record<string, string>;
  mixed?: MixedGameEntry[];
  scoring?: ScoringConfig;
  announcement: string;
  details: string;
  prizeText: string;
  sponsor: string;
  closingMessage?: string;
  winners?: Winner[];
  hosts?: string[];
  startUTC: number;
  createdTZ: string;
  registrationOpensAt?: number;
  organizerId: string;
  organizerName: string;
  managerIds?: string[];
  registrations?: Registration[];
  cancelled?: boolean;
  completed?: boolean;
  locked?: boolean;
  registrationClosed?: boolean;
  registrationSoon?: boolean;
  createdAt: number;
  updatedAt: number;
  forgeState?: ForgeState;
}

export interface Tournament extends TournamentData {
  id: string;
  status: TournamentStatus;
  registrations: Registration[];
  registeredCount: number;
  hosts: string[];
  managerIds: string[];
  winners: Winner[];
  closingMessage: string;
  completed: boolean;
  cancelled: boolean;
  locked: boolean;
  registrationClosed: boolean;
  registrationSoon: boolean;
  registrationOpensAt: number;
  teamSize: TeamSize;
  gameMode: string;
  format: string;
  playersPerMatch: number;
  gameSettings: Record<string, string>;
  mixed: MixedGameEntry[];
  teamCapacity: number;
}

export interface OrganizerData {
  username: string;
  usernameLower: string;
  password: string;
  displayName: string;
  canManageOrganizers: boolean;
  maxTournaments?: number;
  createdBy?: string;
  createdAt: number;
}

export interface Organizer extends OrganizerData {
  id: string;
}

export interface OrganizerInput {
  username: string;
  password: string;
  displayName: string;
  canManageOrganizers?: boolean;
  maxTournaments?: number;
}

export interface ParticipantTarget {
  tournament: Tournament;
  index: number | null;
}

export interface OrganizerUpdate {
  username?: string;
  displayName?: string;
  canManageOrganizers?: boolean;
  maxTournaments?: number;
}

export type MessageFrom = 'organizer' | 'admin';

export interface InboxMessage {
  id: string;
  from: MessageFrom;
  text: string;
  at: number;
}

export interface InboxThread {
  organizerId: string;
  organizerName: string;
  messages: InboxMessage[];
  adminUnread: boolean;
  organizerUnread: boolean;
  updatedAt: number;
}

export interface ChatLine {
  id: number;
  ref?: string;
  mine: boolean;
  text: string;
  at: number;
}

export interface ForgeImport {
  tournamentId: string;
  title: string;
  game: string;
  members: string[];
}

export interface RegistrationResult {
  ok: boolean;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface UsageDay {
  reads: number;
  writes: number;
  deletes: number;
}

export interface UsageDoc {
  days: Record<string, UsageDay>;
}

export interface ClearOptions {
  registrations: boolean;
  forgeState: boolean;
  winners: boolean;
  closingMessage: boolean;
  details: boolean;
}

export interface CollectionUsage {
  name: string;
  count: number;
  bytes: number;
}

export interface TournamentUsage {
  id: string;
  title: string;
  bytes: number;
  registrations: number;
  hasBracket: boolean;
}

export interface StorageEstimate {
  totalBytes: number;
  collections: CollectionUsage[];
  tournaments: TournamentUsage[];
}

export interface SkippedParticipant {
  label: string;
  reason: string;
}

export interface BulkAddResult {
  ok: boolean;
  message: string;
  added: number;
  skipped: SkippedParticipant[];
}
