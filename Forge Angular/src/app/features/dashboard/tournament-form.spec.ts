import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Session } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { TournamentService } from '../../core/services/tournament.service';
import { TournamentForm } from './tournament-form';

describe('TournamentForm game options', () => {
  const create = vi.fn();
  const session: Session = { role: 'admin', id: 'admin', displayName: 'Admin' };

  beforeEach(() => {
    create.mockReset().mockResolvedValue({});
    TestBed.configureTestingModule({
      providers: [
        { provide: FirestoreService, useValue: { db: {} } },
        {
          provide: AuthService,
          useValue: {
            session: signal<Session | null>(session),
            isAdmin: signal(true),
            canViewOrganizers: signal(true),
          },
        },
        { provide: TournamentService, useValue: { create } },
      ],
    });
  });

  const choose = async (
    root: HTMLElement,
    id: string,
    value: string,
    fixture: { whenStable(): Promise<unknown> },
  ) => {
    const select = root.querySelector('#' + id) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const options = (root: HTMLElement, id: string) =>
    Array.from((root.querySelector('#' + id) as HTMLSelectElement).options).map((o) => o.value);

  it('offers modes, formats and settings per game', async () => {
    const fixture = TestBed.createComponent(TournamentForm);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    expect(options(root, 'tf_format')).toEqual(['2p', '2v2']);
    expect(options(root, 'tf_gameMode')).toEqual(['Turn-based', 'Live']);

    await choose(root, 'tf_game', 'Bullsh!t', fixture);
    expect(options(root, 'tf_format')).toEqual(['1v1v1v1']);
    expect(root.querySelector('#tf_setting_0')).not.toBeNull();

    expect((root.querySelector('#tf_slots') as HTMLInputElement).value).toBe('32');
    await choose(root, 'tf_game', 'Chess', fixture);
    expect(options(root, 'tf_format')).toEqual(['1v1']);
  });

  it('shows the points system for Werewolf and saves it', async () => {
    const fixture = TestBed.createComponent(TournamentForm);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    expect(root.querySelector('#tf_points_proPoints')).toBeNull();
    await choose(root, 'tf_game', 'Werewolf', fixture);
    const slots = () => (root.querySelector('#tf_slots') as HTMLInputElement).value;
    expect(slots()).toBe('36');
    await choose(root, 'tf_format', '7p', fixture);
    expect(slots()).toBe('28');
    await choose(root, 'tf_format', '9p', fixture);
    expect(slots()).toBe('36');
    expect(options(root, 'tf_format')).toEqual(['7p', '9p']);
    expect(root.querySelector('#tf_points_proPoints')).not.toBeNull();
    expect(root.querySelector('#tf_points_nabPoints')).not.toBeNull();
    expect(root.textContent).not.toContain('Use a points system');

    const set = (id: string, value: string) => {
      const el = root.querySelector('#' + id) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('tf_title', 'Wolf Night');
    set('tf_announcement', 'Hype');
    set('tf_date', '2026-01-15');
    set('tf_time', '10:00');
    set('tf_points_villagersWin', '4');
    set('tf_points_proPoints', '5');
    set('tf_points_nabPoints', '2');
    await choose(root, 'tf_format', '7p', fixture);

    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(create).toHaveBeenCalledTimes(1);
    const [input] = create.mock.calls[0];
    expect(input).toMatchObject({
      game: 'Werewolf',
      gameMode: 'Live',
      format: '7p',
      playersPerMatch: 7,
      teamSize: 1,
      scoring: {
        enabled: true,
        villagersWin: 4,
        villagersLose: 0,
        werewolvesWin: 3,
        werewolvesLose: 0,
        proPoints: 5,
        nabPoints: 2,
      },
    });
    expect(Object.keys(input.gameSettings)).toEqual(['All random roles', 'Language']);
    expect(input.winners).toEqual([]);
  });

  it('labels count formats as players and starts Bingo and Bounce with one full game', async () => {
    const fixture = TestBed.createComponent(TournamentForm);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const slots = () => (root.querySelector('#tf_slots') as HTMLInputElement).value;
    const labels = (id: string) =>
      Array.from((root.querySelector('#' + id) as HTMLSelectElement).options).map((o) =>
        o.text.trim(),
      );

    await choose(root, 'tf_game', 'Bingo', fixture);
    expect(options(root, 'tf_format')).toEqual(['2p', '4p', '8p', '15p']);
    expect(labels('tf_format')).toEqual(['2 players', '4 players', '8 players', '15 players']);
    await choose(root, 'tf_format', '15p', fixture);
    expect(slots()).toBe('15');
    expect(root.textContent).not.toContain("isn't a multiple");
    await choose(root, 'tf_format', '8p', fixture);
    expect(slots()).toBe('8');
    await choose(root, 'tf_format', '4p', fixture);
    expect(slots()).toBe('32');

    await choose(root, 'tf_game', 'Bounce', fixture);
    expect(labels('tf_format')).toEqual([
      '2 players',
      '3 players',
      '4 players',
      '6 players',
      '8 players',
      '16 players',
    ]);
    await choose(root, 'tf_format', '16p', fixture);
    expect(slots()).toBe('16');
  });

  it('builds a mixed tournament from a list of games', async () => {
    const fixture = TestBed.createComponent(TournamentForm);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const click = async (needle: string) => {
      Array.from(root.querySelectorAll('button'))
        .find((b) => b.textContent?.includes(needle))
        ?.click();
      await fixture.whenStable();
    };

    expect(root.querySelector('tf-mixed-games-editor')).toBeNull();
    await choose(root, 'tf_game', '__mixed__', fixture);
    expect(root.querySelector('tf-mixed-games-editor')).not.toBeNull();
    expect(root.querySelector('#tf_format')).toBeNull();
    expect(root.querySelectorAll('.entry').length).toBe(2);

    await click('Add game');
    expect(root.querySelectorAll('.entry').length).toBe(3);
    await choose(root, 'mix_game_2', 'Bounce', fixture);
    (root.querySelectorAll('button[aria-label="Move up"]')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect((root.querySelector('#mix_game_1') as HTMLSelectElement).value).toBe('Bounce');

    const set = (id: string, value: string) => {
      const el = root.querySelector('#' + id) as HTMLInputElement;
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    set('tf_title', 'Mix Night');
    set('tf_announcement', 'Hype');
    set('tf_date', '2026-01-15');
    set('tf_time', '10:00');
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const input = create.mock.calls.at(-1)?.[0];
    expect(input.game).toBe('Bingo + Bounce + Ocho');
    expect(input.teamSize).toBe(1);
    expect(input.mixed.map((m: { game: string }) => m.game)).toEqual(['Bingo', 'Bounce', 'Ocho']);
  });

  it('requires at least two games for a mixed tournament', async () => {
    const fixture = TestBed.createComponent(TournamentForm);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await choose(root, 'tf_game', '__mixed__', fixture);
    const remove = () =>
      (root.querySelector('button[aria-label="Remove game"]') as HTMLButtonElement).disabled;
    expect(remove()).toBe(true);
  });
});
