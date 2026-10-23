import { Tournament } from '../models/models';
import { CHAT_LIMIT } from './bracket';

export type MessageCategory =
  'Greeting' | 'Before the tour' | 'During the tour' | 'Crowd control' | 'Wrap up';

export interface MessageTemplate {
  id: string;
  category: MessageCategory;
  label: string;
  text: string;
  textNoGroup?: string;
  textWithKey?: string;
}

export interface MessageVars {
  title: string;
  group: string;
  time: string;
  hosts: string;
  slotsLeft: string;
  key?: string;
  link?: string;
}

export interface RenderedMessage {
  text: string;
  length: number;
  truncated: boolean;
  tooLong: boolean;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'welcome',
    category: 'Greeting',
    label: 'Welcome & greet',
    text: 'Welcome to {group}! 🎉 {title}. Please do check the rules on the website to be ready. All the best! 🍀',
    textNoGroup:
      'Welcome to {title}! 🎉 Please do check the rules on the website to be ready. All the best! 🍀',
  },
  {
    id: 'registration',
    category: 'Greeting',
    label: 'Registration open',
    text: '📢 Registration is open for {title}! Register here: {link} with your Plato ID. {slotsLeft} Hurry up! ⚔️',
    textWithKey:
      '📢 Registration is open for {title}! Register here: {link} 🔑 Registration key: {key}. {slotsLeft} Hurry up! ⚔️',
  },
  {
    id: 'get-ready',
    category: 'Before the tour',
    label: 'Get ready (starts in…)',
    text: 'All registered players, please get ready! ⏰ {title} starts in {time}. Good luck and all the best! 🍀',
  },
  {
    id: 'last-call',
    category: 'Before the tour',
    label: 'Last call',
    text: '⏳ Last call! {title} starts in {time}. Please make sure your Plato ID is correct on the website. Late players may be replaced.',
  },
  {
    id: 'starting-now',
    category: 'Before the tour',
    label: 'Starting now',
    text: '🚀 {title} is starting NOW! Be ready and online. Hosts: {hosts}. Good luck, everyone! 🍀',
  },
  {
    id: 'match-ready',
    category: 'During the tour',
    label: 'Matches ready',
    text: '🎮 Matches are ready! First player creates the game and shares the table number with their opponent. Hosts ({hosts}) will oversee the matches. Winners, please tag the host.',
  },
  {
    id: 'next-round',
    category: 'During the tour',
    label: 'Next round',
    text: '✅ Round complete! The next match set is up - check "Current matches" on the website to find your match. Winners, please tag the host! 🎯',
  },
  {
    id: 'no-show',
    category: 'During the tour',
    label: 'No-show warning',
    text: '⚠️ Players who have not joined their table within 5 minutes may be replaced or disqualified. Please be quick! - {title}',
  },
  {
    id: 'replacement',
    category: 'During the tour',
    label: 'Replacement notice',
    text: '🔁 Some players have not shown up, so replacements are being added. Please stay tuned and keep an eye on the website for your match.',
  },
  {
    id: 'calm',
    category: 'Crowd control',
    label: 'Stay calm & patient',
    text: '🙏 Please stay calm and be patient. Matches are called in order, so no need to spam. Tag the host only for results or issues. Thank you for your support! 💙',
  },
  {
    id: 'no-spam',
    category: 'Crowd control',
    label: 'Keep chat clear',
    text: '🔇 Kindly avoid spamming and keep the chat clear for host updates. Everyone will get their turn. Thanks for understanding! 🙏',
  },
  {
    id: 'fair-play',
    category: 'Crowd control',
    label: 'Fair play & respect',
    text: '📜 Play fair and respect your opponents. No AFK, no arguing in chat. The host decision is final. Good luck! 🏆',
  },
  {
    id: 'results',
    category: 'Wrap up',
    label: 'Winners & thanks',
    text: '🏆 Congratulations to the winners of {title}! Results are on the website. Thank you all for playing - see you in the next one! 🎉',
  },
];

const fill = (template: string, vars: MessageVars): string =>
  template
    .split('{group}')
    .join(vars.group)
    .split('{title}')
    .join(vars.title)
    .split('{time}')
    .join(vars.time)
    .split('{hosts}')
    .join(vars.hosts)
    .split('{slotsLeft}')
    .join(vars.slotsLeft)
    .split('{key}')
    .join(vars.key ?? '')
    .split('{link}')
    .join(vars.link ?? '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([!?.,])/g, '$1')
    .trim();

const shorten = (value: string, over: number): string => {
  const keep = Math.max(6, value.length - over - 1);
  return keep >= value.length ? value : value.slice(0, keep).trimEnd() + '…';
};

export function renderMessage(
  template: MessageTemplate,
  vars: MessageVars,
  limit = CHAT_LIMIT,
): RenderedMessage {
  const source =
    vars.key && template.textWithKey
      ? template.textWithKey
      : !vars.group.trim() && template.textNoGroup
        ? template.textNoGroup
        : template.text;
  const current = { ...vars };
  let text = fill(source, current);
  let truncated = false;
  for (const key of ['title', 'group'] as const) {
    if (text.length > limit && current[key].length > 6) {
      current[key] = shorten(current[key], text.length - limit);
      text = fill(source, current);
      truncated = true;
    }
  }
  return { text, length: text.length, truncated, tooLong: text.length > limit };
}

export function formatDuration(amount: number, unit: 'mins' | 'hours'): string {
  const n = Math.max(0, Math.round(amount) || 0);
  const word = unit === 'hours' ? (n === 1 ? 'hour' : 'hours') : n === 1 ? 'min' : 'mins';
  return `${n} ${word}`;
}

export function defaultCountdown(
  startUTC: number,
  now = Date.now(),
): { amount: number; unit: 'mins' | 'hours' } {
  const minutes = Math.max(0, Math.round((startUTC - now) / 60000));
  return minutes >= 180
    ? { amount: Math.round(minutes / 60), unit: 'hours' }
    : { amount: minutes, unit: 'mins' };
}

export function slotsLeftText(capacity: number, registered: number, isTeam: boolean): string {
  if (!capacity) return '';
  const left = Math.max(0, capacity - registered);
  return `Only ${left} ${isTeam ? 'team ' : ''}slot${left === 1 ? '' : 's'} left!`;
}

export function registrationMessage(
  t: Pick<
    Tournament,
    | 'title'
    | 'groupName'
    | 'startUTC'
    | 'hosts'
    | 'organizerName'
    | 'teamCapacity'
    | 'registeredCount'
    | 'teamSize'
  >,
  key: string,
  link: string,
): string {
  const countdown = defaultCountdown(t.startUTC);
  const template = MESSAGE_TEMPLATES.find((m) => m.id === 'registration') as MessageTemplate;
  return renderMessage(template, {
    title: t.title,
    group: t.groupName ?? '',
    time: formatDuration(countdown.amount, countdown.unit),
    hosts: (t.hosts.length ? t.hosts : [t.organizerName || 'the host']).join(', '),
    slotsLeft: slotsLeftText(t.teamCapacity, t.registeredCount, t.teamSize === 2),
    key,
    link,
  }).text;
}
