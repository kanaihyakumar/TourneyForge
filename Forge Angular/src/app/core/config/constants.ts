import { SelectOption, TeamSize, TournamentStatus } from '../models/models';

export const STORAGE_KEYS = {
  session: 'tf_session_v1',
  myRegistrations: 'tf_my_registrations_v1',
  displayTimezone: 'tf_display_tz',
  forgeImport: 'tf_forge_import',
} as const;

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const ONGOING_WINDOW_MS = 4 * 3600 * 1000;
export const STATUS_REFRESH_MS = 60000;

export const TIMEZONES: { id: string; label: string }[] = [
  { id: 'Asia/Kolkata', label: 'IST - India' },
  { id: 'America/New_York', label: 'ET - US Eastern' },
  { id: 'America/Chicago', label: 'CT - US Central' },
  { id: 'America/Denver', label: 'MT - US Mountain' },
  { id: 'America/Los_Angeles', label: 'PT - US Pacific' },
  { id: 'Europe/London', label: 'GMT/BST - UK' },
  { id: 'Europe/Berlin', label: 'CET - Central Europe' },
  { id: 'Asia/Dubai', label: 'GST - Dubai' },
  { id: 'Asia/Kuwait', label: 'AST - Kuwait' },
  { id: 'Asia/Singapore', label: 'SGT - Singapore' },
  { id: 'Asia/Tokyo', label: 'JST - Japan' },
  { id: 'Australia/Sydney', label: 'AEST - Sydney' },
  { id: 'UTC', label: 'UTC' },
];

export const TIMEZONE_OPTIONS: SelectOption[] = TIMEZONES.map((tz) => ({
  value: tz.id,
  label: tz.label,
}));

export const CLOCK_TICK_MS = 15000;

export const STATUS_RANK: Record<TournamentStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  completed: 2,
  cancelled: 3,
};

export const STATUS_LABELS: Record<TournamentStatus, { long: string; short: string }> = {
  ongoing: { long: '🟢 LIVE NOW', short: '🟢 LIVE' },
  upcoming: { long: '🕒 UPCOMING', short: '🕒 UPCOMING' },
  completed: { long: '✅ COMPLETED', short: '✅ DONE' },
  cancelled: { long: '🚫 CANCELLED', short: '🚫 CANCELLED' },
};

export const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣' };
export const DEFAULT_MEDAL = '🏅';

export const WINNER_PLACES = [
  { place: 1, label: '🥇 1st Place', placeholder: 'e.g. ShadowFang' },
  { place: 2, label: '🥈 2nd Place', placeholder: 'e.g. LunaWolf' },
  { place: 3, label: '🥉 3rd Place', placeholder: 'optional' },
  { place: 4, label: '4️⃣ 4th Place', placeholder: 'optional' },
];

export const DEFAULT_CLOSING_MESSAGE =
  '🙏 Thank you for joining the tour! We appreciate every participant. Those who didn’t win this time - hope you had fun, maybe next time you’ll be the champion! 🎉';

export const DEFAULT_FORGE_MEMBERS = [
  'Speedy1',
  'Speedy2',
  'Speedy3',
  'Speedy4',
  'Speedy5',
  'Speedy6',
  'Speedy7',
  'Speedy8',
];

export const SOLO: TeamSize = 1;
export const DUO: TeamSize = 2;

export const FREE_QUOTA = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
  storageBytes: 1024 * 1024 * 1024,
} as const;

export const USAGE_WARN_RATIO = 0.8;
export const USAGE_FLUSH_MS = 30000;
export const USAGE_HISTORY_DAYS = 90;
export const USAGE_TIMEZONE = 'America/Los_Angeles';

export const ADMIN_OWNER_ID = 'admin';
export const ADMIN_OWNER_NAME = 'Admin';

export const REG_KEYS_COLLECTION = 'registrationKeys';
export const REG_KEY_LENGTH = 5;

export const CONTACT_PLATO_ID = 'Speedy40';
export const CONTACT_DISCORD_ID = 'speedy_speedy';
export const DISCORD_ICON = '👾';

export const ADMIN_PEER_ID = 'tourneyforge-admin-chat-7c41e9a2';
export const MAX_CHAT_TEXT = 500;
export const MAX_CHAT_LINES = 200;
export const MAX_INBOX_MESSAGES = 100;
export const INBOX_POLL_MS = 120_000;
export const CHAT_CONNECT_TIMEOUT_MS = 12_000;

export const LOCKED_NOTICE = `This tournament is published and locked. To change its details, contact Speedy on Plato (platoid: ${CONTACT_PLATO_ID}) or on Discord (${DISCORD_ICON} ${CONTACT_DISCORD_ID}).`;

export const PUBLISH_NOTICE = `Are you sure you want to publish this tournament? Once published it cannot be edited. Only the admin can delete a tournament. To make changes afterwards, contact Speedy on Plato (platoid: ${CONTACT_PLATO_ID}) or on Discord (${DISCORD_ICON} ${CONTACT_DISCORD_ID}).`;

export const LOCK_EXEMPT_FIELDS = [
  'completed',
  'cancelled',
  'winners',
  'closingMessage',
  'registrationOpensAt',
  'registrationClosed',
  'registrationSoon',
];
