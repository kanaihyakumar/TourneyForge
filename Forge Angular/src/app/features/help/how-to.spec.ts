import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GROUP_GUIDE_SLIDES, HOW_TO_SLIDES, SITE_LINK_TOKEN } from '../../core/config/how-to';
import { Session } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { HowTo } from './how-to';

describe('HowTo', () => {
  const session = signal<Session | null>(null);

  beforeEach(() => {
    session.set(null);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { session } }],
    });
  });

  const setup = async () => {
    const fixture = TestBed.createComponent(HowTo);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    return { fixture, root };
  };
  const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ');
  const open = async (fixture: { whenStable(): Promise<unknown> }, root: HTMLElement) => {
    root.querySelector('button')?.click();
    await fixture.whenStable();
    return root.querySelector('tf-how-to-modal') as HTMLElement;
  };
  const dots = (modal: HTMLElement) => modal.querySelectorAll('tf-slideshow .dot').length;
  const goTo = async (
    fixture: { whenStable(): Promise<unknown> },
    modal: HTMLElement,
    n: number,
  ) => {
    (modal.querySelector(`[aria-label="Go to slide ${n}"]`) as HTMLElement).click();
    await fixture.whenStable();
  };

  it('is only available to a logged in admin or organizer', async () => {
    const { fixture, root } = await setup();
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('tf-how-to-modal')).toBeNull();

    session.set({ role: 'organizer', id: 'o1', displayName: 'Bella' });
    await fixture.whenStable();
    expect(root.querySelector('button')?.textContent).toContain('How to use');

    session.set({ role: 'admin', id: 'admin', displayName: 'Admin' });
    await fixture.whenStable();
    expect(root.querySelector('button')).not.toBeNull();

    session.set(null);
    await fixture.whenStable();
    expect(root.querySelector('button')).toBeNull();
  });

  it('walks through registration states, participants, the bracket, completion and support', async () => {
    session.set({ role: 'organizer', id: 'o1', displayName: 'Bella' });
    const { fixture, root } = await setup();
    const modal = await open(fixture, root);
    expect(dots(modal)).toBe(HOW_TO_SLIDES.length);
    expect(text(modal)).toContain('Create a tournament');
    expect(text(modal)).toContain('Demo Cup');

    await goTo(fixture, modal, 2);
    let slide = text(modal);
    expect(slide).toContain('Registration: Soon, Open, Closed');
    expect(slide).toContain('Registration coming soon');
    expect(slide).toContain('Slots full');
    expect(slide).toContain('Registration closed');
    expect(modal.querySelectorAll('.segs .sg').length).toBe(3);
    expect(slide).toContain('Copy registration message');
    expect(slide).toContain('Registration key: 76258');

    await goTo(fixture, modal, 3);
    slide = text(modal);
    expect(slide).toContain('Participants: add and replace');
    expect(slide).toContain('Add participant');
    expect(slide).toContain('Replaced @Maya with @Mia');
    expect(slide).toContain('bracket and the winners');

    await goTo(fixture, modal, 4);
    slide = text(modal);
    expect(slide).toContain('Open in Forge');
    expect(slide).toContain('Also generate a 3rd place match (from the two semifinal losers)');
    expect(slide).toContain('Copy this match set');
    expect(slide).toContain('Start Bracket');

    await goTo(fixture, modal, 5);
    slide = text(modal);
    expect(slide).toContain('Mark Completed');
    expect(slide).toContain('closing message');
    expect(slide).toContain('Messages');

    await goTo(fixture, modal, 6);
    slide = text(modal);
    expect(slide).toContain('Contact support');
    expect(slide).toContain('Speedy40');
    expect(slide).toContain('speedy_speedy');
  });

  it('has a second tab with the guide to running a tournament in the group', async () => {
    session.set({ role: 'admin', id: 'admin', displayName: 'Admin' });
    const { fixture, root } = await setup();
    const modal = await open(fixture, root);
    await goTo(fixture, modal, 3);

    const tabs = Array.from(modal.querySelectorAll('tf-tabs button'));
    expect(tabs.map((t) => t.textContent?.trim())).toEqual([
      '🛠️ Using the site',
      '👥 Running it in your group',
    ]);
    (tabs[1] as HTMLElement).click();
    await fixture.whenStable();
    expect(dots(modal)).toBe(GROUP_GUIDE_SLIDES.length);
    expect(text(modal)).toContain('1. Build the hype');

    const expectations: [number, string[]][] = [
      [1, ['Build the hype', 'keep registration on 🔔 Soon', 'Share the link in your group']],
      [
        2,
        [
          'Registration day',
          'register an hour before',
          'slots are filling fast',
          'registration is full',
          'Copy registration message',
        ],
      ],
      [
        3,
        [
          'Line up your hosts',
          'observe the game and drive it',
          'table that gets created is valid',
          'mark the winner',
        ],
      ],
      [
        4,
        [
          'Run the rounds',
          'Copy this match set',
          'Current matches',
          '2 to 5 minutes',
          'ready for the second round',
        ],
      ],
      [5, ['Declare the winners', 'wait a few minutes', 'DM the host']],
      [6, ['Keep everyone on track', 'check the rules', 'again and again', 'scrolls up']],
      [7, ['Stay calm', 'temper', 'troublesome people', 'sponsored the tournament', 'wish']],
    ];
    for (const [n, phrases] of expectations) {
      await goTo(fixture, modal, n);
      const slide = text(modal);
      for (const phrase of phrases) expect(slide).toContain(phrase);
    }
  });

  it('offers copyable example messages with the real site link filled in', async () => {
    session.set({ role: 'admin', id: 'admin', displayName: 'Admin' });
    const { fixture, root } = await setup();
    const modal = await open(fixture, root);
    (modal.querySelectorAll('tf-tabs button')[1] as HTMLElement).click();
    await fixture.whenStable();
    await goTo(fixture, modal, 2);

    const examples = Array.from(modal.querySelectorAll('.ex-text')).map((e) => e.textContent ?? '');
    expect(examples.length).toBe(2);
    expect(examples[0]).toContain('slots left');
    expect(examples[0]).toContain(location.origin);
    expect(examples.join(' ')).not.toContain(SITE_LINK_TOKEN);
    expect(modal.querySelectorAll('.ex tf-chunk-copy').length).toBe(2);
  });

  it('starts from the first tab and slide again each time it is opened', async () => {
    session.set({ role: 'admin', id: 'admin', displayName: 'Admin' });
    const { fixture, root } = await setup();
    let modal = await open(fixture, root);
    (modal.querySelectorAll('tf-tabs button')[1] as HTMLElement).click();
    await fixture.whenStable();
    await goTo(fixture, modal, 4);
    (modal.querySelector('[aria-label="Close"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(modal.querySelector('tf-slideshow')).toBeNull();

    modal = await open(fixture, root);
    expect(text(modal)).toContain('1. Create a tournament');
    expect(modal.querySelectorAll('tf-tabs button')[0].classList.contains('active')).toBe(true);
  });
});
