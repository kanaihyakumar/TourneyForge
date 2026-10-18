import { SelectOption } from '../models/models';

export interface GameFormat {
  id: string;
  label: string;
  perMatch: number;
  teamSize: 1 | 2;
}

export interface GameSetting {
  label: string;
  options: string[];
}

export interface GameDef {
  name: string;
  modes: string[];
  formats: GameFormat[];
  settings: GameSetting[];
  scoring?: boolean;
}

interface RawGame {
  name: string;
  modes: string[];
  formats: string[] | null;
  settings?: GameSetting[];
}

const RAW_GAMES: RawGame[] = [
  {
    name: 'Ocho',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '3', '4', '6', '2v2'],
    settings: [
      {
        label: 'Special Cards',
        options: ['None', 'All', 'Shield', 'x-Ray', 'Dead Red', 'Boo Blue'],
      },
    ],
  },
  {
    name: 'Pool',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1', '2v2'],
    settings: [
      {
        label: 'Game Type',
        options: [
          '8-Ball 1v1',
          '8-Ball 2v2',
          '8-Ball 2v2 Pro',
          '9-Ball 1v1',
          '9-Ball 2v2',
          '9-Ball 2v2 Pro',
          'Cuthroat(1v1v1)',
        ],
      },
    ],
  },
  {
    name: 'Bowling',
    modes: [],
    formats: ['2', '3', '4', '2v2'],
    settings: [{ label: 'Frames', options: ['5', '10'] }],
  },
  {
    name: 'Match Monsters',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [
      { label: 'Monster Selection modes', options: ['Draft Pick', 'All Pick'] },
      { label: 'Match Rules', options: ['Normal', 'Match Bonus'] },
    ],
  },
  { name: 'Brawlbots', modes: [], formats: ['2', '3', '4', '2v2'] },
  {
    name: 'Bounce',
    modes: [],
    formats: ['2', '3', '4', '6', '8', '16'],
    settings: [{ label: 'Difficulty', options: ['Easy', 'Standard', 'Pro'] }],
  },
  {
    name: 'Plox',
    modes: ['Live'],
    formats: ['2', '3', '4'],
    settings: [{ label: 'Ghost Piece', options: ['On', 'Off'] }],
  },
  {
    name: 'Blitz League',
    modes: [],
    formats: ['1v1'],
    settings: [{ label: 'Health', options: ['50', '100'] }],
  },
  {
    name: 'Skeeball',
    modes: [],
    formats: ['1v1'],
    settings: [{ label: 'Multipliers', options: ['On', 'Off'] }],
  },
  {
    name: 'Ludo',
    modes: ['Live'],
    formats: ['2', '3', '4', '2v2'],
    settings: [
      { label: 'Safe Square', options: ['On', 'Off'] },
      { label: '1st turn exit', options: ['On', 'Off'] },
      { label: 'Goals', options: ['2', '4'] },
    ],
  },
  { name: 'Dice Party', modes: ['Turn-based', 'Live'], formats: null },
  {
    name: 'Bingo',
    modes: [],
    formats: ['2', '4', '8', '15'],
    settings: [{ label: 'Game Mode', options: ['Normal', 'Blackout'] }],
  },
  {
    name: '4 in a Row',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [
      { label: 'Game Type', options: ['4 in a row', '5 in a row'] },
      { label: 'Starting Red Piece', options: ['Me', 'Opponent', 'Random'] },
      { label: 'Prefilled Columns', options: ['None', 'Left', 'Right', 'Both'] },
    ],
  },
  {
    name: 'Dominoes',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '3', '4'],
    settings: [
      { label: 'Rules', options: ['Draw', 'Blocked', 'All-Fives'] },
      { label: 'Points to win', options: ['20', '50', '100'] },
    ],
  },
  {
    name: 'Backgammon',
    modes: [],
    formats: ['2'],
    settings: [
      { label: 'Game Length', options: ['1', '3', '5', '9'] },
      { label: 'Timer', options: ['24h', '1m+5s', '2m+10s', '3m+20s', 'Fixed(1m)'] },
    ],
  },
  {
    name: 'Bankroll',
    modes: ['Live'],
    formats: ['2', '3', '4'],
    settings: [
      { label: 'Rounds', options: ['30', '50', 'Unlimited'] },
      { label: 'Net Worth Goal', options: ['$3000', '$5000', '$7000'] },
    ],
  },
  {
    name: 'Chess',
    modes: [],
    formats: ['1v1'],
    settings: [
      { label: 'Color', options: ['White', 'Black', 'Random'] },
      { label: 'Timer', options: ['24h', '2m+1s', '5m+3s', '15m+0s', '1m+0s'] },
      { label: 'Premoves', options: ['Disabled', 'Enabled'] },
    ],
  },
  { name: 'Sea Battle', modes: ['Turn-based', 'Live'], formats: ['1v1'] },
  {
    name: 'Mancala',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [
      { label: 'First Player', options: ['Player 1', 'Player 2', 'Random'] },
      { label: 'Initial seeds', options: ['3', '4'] },
    ],
  },
  {
    name: 'Dots & Boxes',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '3', '4'],
    settings: [{ label: 'Board Size', options: ['3x3', '5x5', '7x7'] }],
  },
  {
    name: 'Checkers',
    modes: [],
    formats: ['1v1'],
    settings: [
      { label: 'Player color', options: ['Red', 'White', 'Random'] },
      { label: 'Rules', options: ['English', 'International'] },
      { label: 'Timer', options: ['24h', '2m+1s', '5m+3s', '15m+0s'] },
    ],
  },
  {
    name: 'Minesweepers',
    modes: ['Live'],
    formats: ['2', '3', '4'],
    settings: [{ label: 'Speed Bonus', options: ['On', 'Off'] }],
  },
  {
    name: 'Reversi',
    modes: [],
    formats: ['1v1'],
    settings: [{ label: 'My color', options: ['Black', 'white', 'Random'] }],
  },
  {
    name: 'Conquest',
    modes: ['Turn-based', 'Live'],
    formats: null,
    settings: [{ label: 'Round Limit', options: ['5', '10'] }],
  },
  { name: 'Legions', modes: ['Turn-based', 'Live'], formats: null },
  {
    name: 'Go',
    modes: [],
    formats: ['1v1'],
    settings: [
      { label: 'Board size', options: ['19', '13', '9'] },
      { label: 'Handicap', options: ['0', '2', '3', '4', '5', '6', '7'] },
      { label: 'Komi 6.5', options: ['On', 'Off'] },
      { label: 'My color', options: ['Black', 'white', 'random'] },
    ],
  },
  {
    name: 'Cribbage',
    modes: [],
    formats: ['1v1'],
    settings: [{ label: 'Score to win', options: ['121', '61'] }],
  },
  {
    name: 'Gin Rummy',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [{ label: 'Max Points', options: ['50', '100'] }],
  },
  { name: 'Go Fish', modes: ['Live'], formats: ['4', '3', '2'] },
  {
    name: 'Spades',
    modes: ['Turn-based', 'Live'],
    formats: ['2v2'],
    settings: [{ label: 'Play to', options: ['100', '200', '500'] }],
  },
  {
    name: 'Bullsh!t',
    modes: ['Live'],
    formats: ['1v1v1v1'],
    settings: [{ label: 'Ammo', options: ['On', 'Off'] }],
  },
  {
    name: 'Truco',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '4'],
    settings: [
      { label: 'Play to', options: ['12 points', '15 points', '30 points'] },
      { label: 'Mode', options: ['Argentinean', 'Mineiro', 'Paulista'] },
    ],
  },
  { name: 'Old Zombie', modes: ['Live'], formats: ['1v1v1v1'] },
  {
    name: 'Big Two (Pusoy Dos)',
    modes: ['Live'],
    formats: ['1v1v1v1'],
    settings: [{ label: 'Game Rules', options: ['Big 2', 'Pusoy Dos'] }],
  },
  {
    name: 'Hearts',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '4'],
    settings: [
      { label: '-10 pts for Jack of Diamonds', options: ['On', 'Off'] },
      { label: 'Play to', options: ['75points', '100 points', '1 round', '3 rounds'] },
      { label: 'Show round points', options: ['On', 'Off'] },
    ],
  },
  {
    name: 'Bloko',
    modes: ['Live'],
    formats: ['2', '3', '4'],
    settings: [{ label: 'Board Size', options: ['10', '15', '20'] }],
  },
  {
    name: 'Werewolf',
    modes: ['Live'],
    formats: ['7', '9'],
    settings: [
      { label: 'All random roles', options: ['On', 'Off'] },
      {
        label: 'Language',
        options: [
          'English',
          'French',
          'Spanish',
          'Arabic',
          'Indonesian',
          'Thai',
          'German',
          'Malay',
          'Portuguese',
          'Turkish',
          'Persian',
        ],
      },
    ],
  },
  {
    name: 'Draw Together',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [
      { label: 'Rounds', options: ['4', '8'] },
      { label: 'Language', options: ['English', 'Spanish', 'French'] },
    ],
  },
  {
    name: 'The Island',
    modes: ['Live'],
    formats: ['1v1v1v1v1v1v1'],
    settings: [
      { label: 'Language', options: ['English', 'French', 'Spanish', 'Arabic', 'Malayasian'] },
    ],
  },
  {
    name: 'Rock Card',
    modes: ['Live'],
    formats: ['3', '4', '5'],
    settings: [{ label: 'Points to win', options: ['3', '5', '7'] }],
  },
  {
    name: 'Dungeon Tales',
    modes: [],
    formats: ['2', '3', '4', '5'],
    settings: [
      { label: 'Campaign', options: ['All', 'Easy', 'Medium', 'Hard'] },
      { label: 'Language', options: ['English', 'SPanish', 'French'] },
    ],
  },
  {
    name: 'Conspiracy',
    modes: ['Live'],
    formats: ['1v1v1v1v1v1'],
    settings: [{ label: 'Language', options: ['English', 'Spanish', 'French', 'Malaysian'] }],
  },
  {
    name: 'Deep Thots',
    modes: [],
    formats: null,
    settings: [{ label: 'Language', options: ['English', 'French', 'Spanish'] }],
  },
  {
    name: 'Mini Golf',
    modes: ['Live'],
    formats: ['2', '3', '4'],
    settings: [
      { label: 'Holes', options: ['3', '5'] },
      { label: 'Courses', options: ['Random', 'Easy'] },
    ],
  },
  {
    name: 'Table Soccer',
    modes: ['Tactical', 'Active'],
    formats: ['1v1', '2v2'],
    settings: [
      { label: 'Goals to win', options: ['2', '3', '5'] },
      { label: 'Passes', options: ['No Limit', '3', '6'] },
    ],
  },
  {
    name: 'Carrom',
    modes: ['Turn-based', 'Live'],
    formats: ['2', '2v2'],
    settings: [
      {
        label: 'Mode',
        options: ['Classic', 'Pool', 'Freestyle /120', 'Freestyle /160', 'Freestyle /210'],
      },
      { label: 'Breaks', options: ['1st Player', '2nd Player', 'Random'] },
    ],
  },
  {
    name: 'Disc-O',
    modes: [],
    formats: ['1v1'],
    settings: [{ label: 'Bonus Zone', options: ['On', 'Off'] }],
  },
  {
    name: 'Archery',
    modes: ['Standard', 'Quick Draw'],
    formats: ['1v1'],
    settings: [{ label: 'Rounds', options: ['3', '5'] }],
  },
  {
    name: 'Darts',
    modes: [],
    formats: ['1v1'],
    settings: [
      { label: 'Game', options: ['101', '301', '501'] },
      { label: 'Mode', options: ['Easy', 'Pro(Double-Out)'] },
    ],
  },
  {
    name: 'Basketball',
    modes: [],
    formats: ['2', '3', '4'],
    settings: [{ label: 'Rounds', options: ['3', '5'] }],
  },
  {
    name: 'Cup Pong',
    modes: ['Live'],
    formats: ['1v1'],
    settings: [{ label: 'Rerack', options: ['Auto', 'None'] }],
  },
  {
    name: 'Wordbox',
    modes: [],
    formats: ['2', '3', '4'],
    settings: [
      { label: 'Round Time', options: ['60 Seconds', '90 Seconds'] },
      { label: 'Grid Size', options: ['4x4', '5x5'] },
      { label: 'Language', options: ['English', 'French', 'Spanish', 'Arabic'] },
    ],
  },
  {
    name: 'Literati',
    modes: ['Turn-based', 'Live'],
    formats: ['1v1'],
    settings: [{ label: 'Word Helper', options: ['On', 'Off'] }],
  },
  {
    name: 'Match it',
    modes: ['Race'],
    formats: ['1v1'],
    settings: [
      {
        label: 'Game length',
        options: ['Instant- 24Tiles', 'Quick-48 tiles', 'Medium-72 tiles', 'Classic-144 tiles'],
      },
    ],
  },
];

const FALLBACK_FORMATS = ['2', '3', '4', '2v2'];

export function parseFormat(token: string): GameFormat {
  if (token === '2' || token === '1v1') {
    return { id: '1v1', label: '1v1', perMatch: 2, teamSize: 1 };
  }
  if (token === '2v2') {
    return { id: '2v2', label: '2v2 (teams of 2)', perMatch: 2, teamSize: 2 };
  }
  if (token.includes('v')) {
    const sides = token.split('v').length;
    return { id: token, label: `${token} (${sides} players)`, perMatch: sides, teamSize: 1 };
  }
  const count = parseInt(token, 10);
  return { id: `${count}p`, label: `${count} players`, perMatch: count, teamSize: 1 };
}

export const GAME_CATALOG: GameDef[] = RAW_GAMES.map((raw) => ({
  name: raw.name,
  modes: raw.modes,
  formats: (raw.formats ?? FALLBACK_FORMATS).map(parseFormat),
  settings: raw.settings ?? [],
  scoring: raw.name === 'Werewolf',
}));

export const CUSTOM_GAME = '__custom__';

export const CUSTOM_GAME_DEF: GameDef = {
  name: 'Other',
  modes: ['Turn-based', 'Live'],
  formats: FALLBACK_FORMATS.map(parseFormat),
  settings: [],
};

export const GAME_OPTIONS: SelectOption[] = [
  ...GAME_CATALOG.map((g) => ({ value: g.name, label: g.name })),
  { value: CUSTOM_GAME, label: 'Other (type a name)' },
];

export function findGame(name: string): GameDef | null {
  return (
    GAME_CATALOG.find((g) => g.name.toLowerCase() === (name || '').trim().toLowerCase()) ?? null
  );
}

export function formatById(game: GameDef, id: string): GameFormat {
  return game.formats.find((f) => f.id === id) ?? game.formats[0];
}

export const toOptions = (values: string[]): SelectOption[] =>
  values.map((v) => ({ value: v, label: v }));

export function playersPerTable(format: GameFormat): number {
  return format.perMatch * format.teamSize;
}

export function suggestedSlots(format: GameFormat, target = 32): number {
  const per = playersPerTable(format);
  const tables = 2 ** Math.max(0, Math.round(Math.log2(target / per)));
  return per * tables;
}
