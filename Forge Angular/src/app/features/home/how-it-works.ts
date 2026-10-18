import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Step {
  title: string;
  text: string;
}

@Component({
  selector: 'tf-how-it-works',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.scss',
})
export class HowItWorks {
  protected readonly steps: Step[] = [
    {
      title: '1. Pick a tournament',
      text: 'Browse the live and upcoming tournaments and tap Register.',
    },
    {
      title: '2. Enter your Plato ID',
      text: 'Type your Plato ID (and your partner’s for 2v2) and confirm.',
    },
    {
      title: '3. Check your match',
      text: 'Follow the bracket on the card to see who you play next.',
    },
    { title: '4. Win and celebrate', text: 'Tell the host your result and climb to the podium!' },
  ];
  protected readonly confetti = Array.from({ length: 14 }, (_, i) => ({
    x: 330 + ((i * 53) % 220) - 110,
    delay: (i % 7) * 0.12,
    color: ['var(--accent)', 'var(--success)', 'var(--warn)', 'var(--danger)'][i % 4],
    rotate: (i * 47) % 180,
  }));
}
