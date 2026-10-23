import { CONTACT_DISCORD_ID, CONTACT_PLATO_ID, DISCORD_ICON } from './constants';

export type HowToVisualId = 'create' | 'status' | 'participants' | 'forge' | 'results' | 'help';

export interface HowToSlide {
  id: HowToVisualId;
  icon: string;
  title: string;
  audience: string;
  steps: string[];
}

export interface GroupGuideSlide {
  icon: string;
  title: string;
  when: string;
  points: string[];
  examples?: string[];
}

export const SITE_LINK_TOKEN = '{link}';

export const DEMO_PLAYERS = ['Aiden', 'Maya', 'Lucas', 'Nora', 'Ethan', 'Zoe', 'Mason', 'Ivy'];

export const DEMO_TOURNAMENT = {
  title: 'Demo Cup',
  game: 'Carrom',
  when: 'Sat, Oct 25 · 7:00 PM',
  opens: 'Fri, Oct 24 · 6:00 PM',
  slots: 32,
};

export const DEMO_CONTACT = {
  plato: CONTACT_PLATO_ID,
  discord: CONTACT_DISCORD_ID,
  discordIcon: DISCORD_ICON,
};

export const HOW_TO_SLIDES: HowToSlide[] = [
  {
    id: 'create',
    icon: '🛠️',
    title: 'Create a tournament',
    audience: 'For organizers',
    steps: [
      'Log in with the account you were given and open your dashboard.',
      'Fill in the title, game, date and time - here “Demo Cup”, Carrom, Saturday 7 PM.',
      'Optionally pick when registration opens. You can also leave it and switch Soon / Open / Closed later.',
      'Press Publish and confirm. It goes live on the home page straight away and is then locked for editing. A unique 5-digit registration key is created for it.',
    ],
  },
  {
    id: 'status',
    icon: '🔔',
    title: 'Registration: Soon, Open, Closed',
    audience: 'For organizers',
    steps: [
      'Every tournament in “My Tournaments” has a 🔔 Soon | ⚔️ Open | 🔒 Closed switch. The highlighted one is the current state.',
      '🔔 Soon - the card says “Registration coming soon” and hides the Register button. Perfect for building hype before sign-ups.',
      '⚔️ Open - players register with their Plato ID and the tournament’s 5-digit registration key. When you switch to Open, a 📋 Copy registration message button appears beside the switch: tap it and paste the message in your group. It already has the title, the link, the key and how many slots are left.',
      '🔑 Key shows the key itself, lets you create a new one or turn it off. Slots show “Slots full” by themselves once every slot is taken.',
      '🔒 Closed - no new sign-ups. You can still add participants yourself.',
    ],
  },
  {
    id: 'participants',
    icon: '👥',
    title: 'Participants: add and replace',
    audience: 'For organizers',
    steps: [
      'Press 👥 Participants on your tournament to see everyone who registered, and copy all their IDs in one tap.',
      '➕ Add participant lets you add someone yourself, even when registration is closed. Slots still apply. Admins can also paste a whole list.',
      'Someone didn’t show up? Tap 🔁 on their name and enter the replacement.',
      'The swap is made everywhere at once: the participants list, the bracket and the winners.',
    ],
  },
  {
    id: 'forge',
    icon: '🎲',
    title: 'Open in Forge: the bracket',
    audience: 'For organizers',
    steps: [
      'Press 🎲 Open in Forge on your tournament. Registered players are loaded in automatically.',
      'Keep “Also generate a 3rd place match (from the two semifinal losers)” ticked if you want one. It has to be set before you start.',
      'Press Start Bracket, then tap the winner of each match. The next round, and the 3rd place match, are generated for you.',
      'Use “Copy this match set” to paste the matchups into the group. Everyone can also follow along with “Current matches” on the tournament card.',
    ],
  },
  {
    id: 'results',
    icon: '🏆',
    title: 'Mark completed, winners and messages',
    audience: 'For organizers',
    steps: [
      'When the last match is done, open ✏️ Edit (or 🏅 Results on a locked tournament) and press “Pull winners from Match Bracket / points”. Prizes are filled in from your announcement where they can be.',
      'Press ✅ Mark Completed. The card moves to Completed and the winners scroll across the Hall of Fame.',
      'Open 💬 Messages for ready-made posts, including the closing message. Copy it in pieces that fit the chat and send it to the group.',
    ],
  },
  {
    id: 'help',
    icon: '💬',
    title: 'Contact support',
    audience: 'For organizers',
    steps: [
      'Use the Messages tab on your dashboard to leave the admin a note. Replies show up in the same place.',
      'Need an answer right now? Tap the floating chat button for a live chat. Live chats are never saved.',
      `Or reach Speedy on Plato (platoid: ${CONTACT_PLATO_ID}) or on Discord (${DISCORD_ICON} ${CONTACT_DISCORD_ID}).`,
      'Published tournaments are locked, and only the admin can delete one. Ask the admin to unlock or remove a tournament if you need to.',
    ],
  },
];

export const GROUP_GUIDE_SLIDES: GroupGuideSlide[] = [
  {
    icon: '📣',
    title: 'Build the hype',
    when: 'Before the day',
    points: [
      'Create the tournament here first and keep registration on 🔔 Soon.',
      'Share the link in your group at the moment you feel is right to create the hype. There is no need to wait for registration to open.',
    ],
    examples: [
      `🏆 Demo Cup is coming! Saturday, 7 PM. Registration opens soon - watch this space 👀 ${SITE_LINK_TOKEN}`,
    ],
  },
  {
    icon: '📝',
    title: 'Registration day',
    when: 'About an hour before the start',
    points: [
      'Switch registration to ⚔️ Open and let participants register an hour before the tournament.',
      'Tap 📋 Copy registration message beside the Soon / Open / Closed switch and paste it in the group. Players need the key in it plus their Plato ID, so only people in your group can join.',
      'Keep nudging in the group as slots fill up: how many are left, register soon, slots are filling fast.',
      'Once every slot is taken, say that registration is full, wish everyone all the best and ask them to be ready at the time of the tournament.',
    ],
    examples: [
      `⏳ Only 8 slots left! Register soon - they're filling fast 🔥 ${SITE_LINK_TOKEN} 🔑 Registration key: 12345`,
      '✅ Registration is full! All the best to every participant. Please be ready at the start time 🙌',
    ],
  },
  {
    icon: '🎙️',
    title: 'Line up your hosts',
    when: 'Before it starts',
    points: [
      'Have hosts who will observe the game and drive it.',
      'Hosts check that every table that gets created is valid.',
      'Hosts also watch who wins each match, so they can mark the winner on the bracket matches in Forge.',
    ],
  },
  {
    icon: '🔁',
    title: 'Run the rounds',
    when: 'During the tournament',
    points: [
      'Share the matchups by copying and pasting them from Forge (“Copy this match set”).',
      'Tell players they can open the site, see their matches under “Current matches”, create the table themselves and ask their opponent to join.',
      'Wait 2 to 5 minutes before the next round. Some players may need to catch their breath.',
      'Keep the crowd engaged, for example by asking “Are you ready for the second round?”.',
    ],
    examples: [
      `🎯 Round 1 matchups are up! Check your match here and create your table: ${SITE_LINK_TOKEN}`,
    ],
  },
  {
    icon: '🏆',
    title: 'Declare the winners',
    when: 'When the last round is over',
    points: [
      'Once every round is over, wait a few minutes and then declare the winners.',
      'Ask the winners to DM the host, or whoever the host names, to sort out their prizes.',
      'Then pull the winners into the tournament and mark it completed.',
    ],
    examples: ['🥇 Congratulations to our winners! Please DM the host to claim your prize 🎁'],
  },
  {
    icon: '📌',
    title: 'Keep everyone on track',
    when: 'The whole time',
    points: [
      'Keep reminding people to check the rules and their matches on the site. It has everything.',
      'Keep sharing the link in the group again and again. With so many messages it scrolls up and people have to hunt for it.',
    ],
    examples: [
      `📌 Rules and matches are all on the site - please check there first: ${SITE_LINK_TOKEN}`,
    ],
  },
  {
    icon: '🧘',
    title: 'Stay calm, finish warm',
    when: 'Always, and at the end',
    points: [
      'Hosts should not get hyper because of any issue. Keep your temper under control.',
      'There may be troublesome people sometimes - not often. Stay calm and polite.',
      'At the end, share the name of the person who sponsored the tournament and ask everyone to just send them a wish.',
    ],
    examples: [
      '💜 A big thank you to our sponsor @Name for making this possible! Drop them a wish 🙏',
    ],
  },
];
