const TEAM_SEPARATOR = ' & ';

export function formatPlatoId(raw: unknown): string {
  const str = String(raw ?? '').trim();
  if (str.includes(TEAM_SEPARATOR)) {
    return str.split(TEAM_SEPARATOR).map(formatPlatoId).join(TEAM_SEPARATOR);
  }
  const clean = str.replace(/@/g, '');
  return clean ? '@' + clean : '';
}

export function teamLabel(platoId?: string, partnerPlatoId?: string): string {
  const a = String(platoId || '').trim();
  const b = String(partnerPlatoId || '').trim();
  return b ? a + TEAM_SEPARATOR + b : a;
}

export function normalizePlatoId(raw: unknown): string {
  return String(raw || '')
    .trim()
    .replace(/@/g, '')
    .toLowerCase();
}

export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

export interface ParsedParticipant {
  platoId: string;
  partnerPlatoId: string;
}

export function parseParticipantList(text: string, isTeam: boolean): ParsedParticipant[] {
  const pieces = isTeam ? text.split(/[\r\n]+/) : text.split(/[\r\n,;]+/);
  return pieces
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      if (!isTeam) return { platoId: piece, partnerPlatoId: '' };
      const [first = '', second = ''] = piece.split(/[&+,;/]/).map((part) => part.trim());
      return { platoId: first, partnerPlatoId: second };
    });
}
