export interface NewGame {
  name: string;
  addedOn: string;
  tagline: string;
}

export const NEW_GAME_DAYS = 7;

export const NEW_GAMES: NewGame[] = [];

export function activeNewGames(now = Date.now()): NewGame[] {
  const windowMs = NEW_GAME_DAYS * 86_400_000;
  return NEW_GAMES.filter((g) => {
    const age = now - Date.parse(g.addedOn);
    return age >= 0 && age <= windowMs;
  });
}

export function isNewGame(name: string, now = Date.now()): boolean {
  return activeNewGames(now).some((g) => g.name === name);
}
