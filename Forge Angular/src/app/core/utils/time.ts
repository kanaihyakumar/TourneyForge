import { TIMEZONES } from '../config/constants';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(ms: number, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  formatter.formatToParts(new Date(ms)).forEach((part) => (map[part.type] = part.value));
  return {
    year: parseInt(map['year'], 10),
    month: parseInt(map['month'], 10),
    day: parseInt(map['day'], 10),
    hour: map['hour'] === '24' ? 0 : parseInt(map['hour'], 10),
    minute: parseInt(map['minute'], 10),
    second: parseInt(map['second'], 10),
  };
}

function offsetAt(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = offsetAt(asUtc, timeZone);
  let utc = asUtc - offset;
  const adjusted = offsetAt(utc, timeZone);
  if (adjusted !== offset) utc = asUtc - adjusted;
  return utc;
}

export function formatInTimezone(utcMillis: number, timeZone: string): string {
  if (!utcMillis) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(utcMillis));
  } catch {
    return new Date(utcMillis).toString();
  }
}

export function timezoneLabel(id: string): string {
  const tz = TIMEZONES.find((t) => t.id === id);
  return tz ? tz.label.split(' - ')[0] : id;
}

export function formatWithZone(utcMillis: number, timeZone: string): string {
  return `${formatInTimezone(utcMillis, timeZone)} (${timezoneLabel(timeZone)})`;
}

export function utcToLocalParts(
  utcMillis: number,
  timeZone: string,
): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  formatter.formatToParts(new Date(utcMillis)).forEach((p) => (parts[p.type] = p.value));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    time: `${parts['hour']}:${parts['minute']}`,
  };
}

export function localPartsToUtc(date: string, time: string, timeZone: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return zonedTimeToUtc(year, month, day, hour, minute, timeZone);
}
