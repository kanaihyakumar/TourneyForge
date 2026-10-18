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

    expect(options(root, 'tf_format')).toEqual(['1v1', '2v2']);
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
  });
});
