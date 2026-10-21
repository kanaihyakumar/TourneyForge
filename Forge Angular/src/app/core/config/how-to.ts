export type HowToVisualId = 'create' | 'register' | 'play' | 'results' | 'help';

export interface HowToSlide {
  id: HowToVisualId;
  icon: string;
  title: string;
  audience: string;
  steps: string[];
}

export const DEMO_PLAYERS = ['Aiden', 'Maya', 'Lucas', 'Nora', 'Ethan', 'Zoe', 'Mason', 'Ivy'];

export const DEMO_TOURNAMENT = {
  title: 'Demo Cup',
  game: 'Carrom',
  when: 'Sat, Oct 25 · 7:00 PM',
  opens: 'Fri, Oct 24 · 6:00 PM',
  slots: 32,
};

export const HOW_TO_SLIDES: HowToSlide[] = [
  {
    id: 'create',
    icon: '🛠️',
    title: 'Create a tournament',
    audience: 'For organizers',
    steps: [
      'Log in with the organizer account you were given.',
      'Fill in the title, game, date and time - here “Demo Cup”, Carrom, Saturday 7 PM.',
      'Optionally pick when registration opens, so players see “Registration soon” first.',
      'Press Publish and confirm. It goes live on the home page straight away.',
    ],
  },
  {
    id: 'register',
    icon: '⚔️',
    title: 'Registration, step by step',
    audience: 'For players',
    steps: [
      '🔔 Registration soon - the card counts down to the opening time.',
      '⚔️ Register - enter your Plato ID (and your partner’s for 2v2) and confirm.',
      '🚫 Slots full - once every slot is taken, sign-ups stop automatically.',
    ],
  },
  {
    id: 'play',
    icon: '🎲',
    title: 'Run the bracket',
    audience: 'For organizers',
    steps: [
      'Press “Open in Forge” on your tournament - registered players load in automatically.',
      'Start the bracket and tap the winner of each match.',
      'Everyone can follow along with “Current matches” on the tournament card.',
    ],
  },
  {
    id: 'results',
    icon: '🏆',
    title: 'Wrap up and celebrate',
    audience: 'For organizers',
    steps: [
      'Pull the winners from the bracket and add the prize each one won.',
      'Mark the tournament completed.',
      'Winners and prizes scroll across the Hall of Fame on the home page.',
    ],
  },
  {
    id: 'help',
    icon: '💬',
    title: 'Need a hand?',
    audience: 'For organizers',
    steps: [
      'Use the Messages tab on your dashboard to leave the admin a note - replies show up there.',
      'Tap the floating chat button for a live chat when the admin is online.',
      'Published tournaments are locked. Ask the admin to unlock one if you need to change it.',
    ],
  },
];
