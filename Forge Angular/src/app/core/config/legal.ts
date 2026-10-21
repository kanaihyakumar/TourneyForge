import { CONTACT_DISCORD_ID, CONTACT_PLATO_ID, DISCORD_ICON } from './constants';

export type LegalDocId = 'privacy' | 'terms' | 'disclaimer' | 'contact';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  icon: string;
  title: string;
  hint: string;
  sections: LegalSection[];
}

export const LEGAL_UPDATED = 'October 2026';

const contactLine = `Speedy on Plato (platoid: ${CONTACT_PLATO_ID}) or on Discord (${DISCORD_ICON} ${CONTACT_DISCORD_ID})`;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'privacy',
    icon: '🔐',
    title: 'Privacy Policy',
    hint: `Last updated ${LEGAL_UPDATED}`,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          `TourneyForge is a small community website for running game tournaments on Plato. It is run by Speedy. Questions about this policy can be sent to ${contactLine}.`,
        ],
      },
      {
        heading: 'What we collect',
        paragraphs: ['We keep only what is needed to run tournaments:'],
        bullets: [
          'Plato IDs (and a partner’s Plato ID for 2v2 tournaments) that you or a host enter to register for a tournament.',
          'Tournament details written by organizers: titles, announcements, hosts, sponsors, brackets, match results, points and winners.',
          'Organizer and admin account details: display name, username and password, created by an admin or another organizer.',
          'Messages organizers send to the admin from their dashboard, and the admin’s replies. These are stored so both sides can read them later.',
          'Basic usage counters (such as the number of database reads and writes per day) used by the admin to stay within free-tier limits. These do not identify visitors.',
        ],
      },
      {
        heading: 'Live chat',
        paragraphs: [
          'Live chat between an organizer and the admin goes directly between their browsers using WebRTC, with a public PeerJS server only helping the two browsers find each other. Live chat messages are not saved on our database or anywhere else and are gone once the admin closes the chat. Please never share your password in a chat.',
        ],
      },
      {
        heading: 'What we do not collect',
        paragraphs: [
          'We do not ask for your real name, email address, phone number or payment details. We do not run advertising, and we do not sell or rent any information.',
        ],
      },
      {
        heading: 'Public information',
        paragraphs: [
          'Plato IDs you register with, match pairings and tournament results can be shown publicly on the tournament pages so other players can see who is playing and who won. Please only register with a Plato ID you are happy to display.',
        ],
      },
      {
        heading: 'Storage on your device',
        paragraphs: [
          'The site saves a few small items in your browser’s local storage so it works the way you expect:',
        ],
        bullets: [
          'The tournaments you registered for on this device, so the page can show “You’re registered”.',
          'Your chosen display time zone.',
          'A login session if you sign in as an organizer or admin.',
        ],
      },
      {
        heading: 'Where data is kept',
        paragraphs: [
          'Data is stored in Google Firebase (Cloud Firestore) and the site is hosted on Firebase Hosting. Google acts as our infrastructure provider and may process data on its servers under its own terms and privacy policy.',
        ],
      },
      {
        heading: 'Retention and removal',
        paragraphs: [
          `Tournament data is kept while it is useful to the community. Organizers can clear tournament data, and an admin can delete tournaments. To ask for a Plato ID to be removed or corrected, contact ${contactLine}.`,
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'TourneyForge is meant for the Plato community and is not directed at young children. If you believe a child’s information should be removed, please contact us.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update this policy as the site grows. The date at the top shows when it last changed.',
        ],
      },
    ],
  },
  {
    id: 'terms',
    icon: '📜',
    title: 'Terms of Use',
    hint: `Last updated ${LEGAL_UPDATED}`,
    sections: [
      {
        heading: 'Agreement',
        paragraphs: [
          'By using TourneyForge you agree to these terms. If you do not agree, please do not use the site.',
        ],
      },
      {
        heading: 'Using the site',
        paragraphs: ['You agree to:'],
        bullets: [
          'Register only with your own Plato ID, or a partner’s ID with their consent.',
          'Not register on behalf of others to take their slot, and not enter false or abusive information.',
          'Not try to break, overload or gain unauthorized access to the site or its data.',
          'Follow each tournament’s rules and the instructions of its hosts.',
        ],
      },
      {
        heading: 'Organizer and admin accounts',
        paragraphs: [
          'Organizer accounts are created by the admin. Keep your login private and you are responsible for what is published from your account.',
          'Admins may limit how many tournaments an organizer can create. Once a tournament is published it is locked: its details cannot be edited or deleted by the organizer. To change a published tournament, contact the admin, who can unlock it for editing. After editing, it must be published again.',
        ],
      },
      {
        heading: 'Tournaments and results',
        paragraphs: [
          'Each tournament is run by its hosts. Brackets, pairings, scoring and winners are decided by the hosts and their decision is final. Prizes, where offered, are provided by the hosts or sponsors, not by TourneyForge.',
        ],
      },
      {
        heading: 'Content',
        paragraphs: [
          'Organizers are responsible for the text they publish. We may edit or remove content, tournaments or accounts that are abusive, misleading or break these terms.',
        ],
      },
      {
        heading: 'Availability',
        paragraphs: [
          'The site runs on free-tier services and is provided as is. It may be slow, limited or unavailable at times, especially when daily limits are reached.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'To the extent allowed by law, TourneyForge and its owner are not liable for losses arising from the use of the site, missed tournaments, data errors or downtime.',
        ],
      },
      {
        heading: 'Changes and contact',
        paragraphs: [
          `We may update these terms from time to time. Questions can be sent to ${contactLine}.`,
        ],
      },
    ],
  },
  {
    id: 'disclaimer',
    icon: '⚠️',
    title: 'Disclaimer',
    hint: `Last updated ${LEGAL_UPDATED}`,
    sections: [
      {
        heading: 'Not affiliated with Plato',
        paragraphs: [
          'TourneyForge is an independent community project. It is not made, endorsed, sponsored or officially connected with Plato or its owners. Plato and any game names, logos or marks mentioned on this site belong to their respective owners.',
        ],
      },
      {
        heading: 'Information accuracy',
        paragraphs: [
          'Tournament times, rules, slots, prizes and results are entered by organizers. We try to keep everything accurate, but we cannot guarantee it is always complete or up to date. Times are converted to your selected time zone automatically; please double check before the event.',
        ],
      },
      {
        heading: 'Prizes',
        paragraphs: [
          'Prizes such as coins, pips, auras or gifts are offered by tournament hosts and sponsors. TourneyForge does not hold, give out or guarantee any prize.',
        ],
      },
      {
        heading: 'No guarantees',
        paragraphs: [
          'The site is provided as is, without warranties of any kind. Use it at your own discretion and enjoy the games responsibly.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    icon: '💬',
    title: 'Contact',
    hint: 'We would love to hear from you',
    sections: [
      {
        heading: 'Reach Speedy',
        paragraphs: [
          `The best way to get in touch is on Plato (platoid: ${CONTACT_PLATO_ID}) or on Discord (${DISCORD_ICON} ${CONTACT_DISCORD_ID}).`,
          'Organizers who are logged in can also message the admin from their dashboard or start a live chat with the floating chat button.',
        ],
      },
      {
        heading: 'What to contact us about',
        paragraphs: [],
        bullets: [
          'Using TourneyForge for your own group or hosting tournaments as an organizer.',
          'Editing a tournament that has already been published, or raising your tournament limit.',
          'Correcting or removing a Plato ID or other information.',
          'Reporting a bug, a problem with a tournament, or abuse.',
          'Privacy questions about this site.',
        ],
      },
      {
        heading: 'Enjoying TourneyForge?',
        paragraphs: ['Send Speedy an ✨ aura or a 🎁 gift on Plato. It keeps the arena running!'],
      },
    ],
  },
];

export const findLegalDoc = (id: string | undefined): LegalDoc | undefined =>
  LEGAL_DOCS.find((doc) => doc.id === id);
