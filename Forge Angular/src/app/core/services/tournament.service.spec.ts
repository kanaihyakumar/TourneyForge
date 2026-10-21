import { TestBed } from '@angular/core/testing';
import * as firestore from 'firebase/firestore';
import { FirestoreService } from './firestore.service';
import { TournamentLimitError, TournamentService } from './tournament.service';

const store = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  owned: 0,
}));

vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  getDocs: () => Promise.resolve({ docs: Array.from({ length: store.owned }) }),
  getDoc: () => Promise.resolve({ exists: () => true, id: 't1', data: () => store.data }),
  updateDoc: (_ref: unknown, patch: Record<string, unknown>) => {
    store.updates.push(patch);
    return Promise.resolve();
  },
  addDoc: () => Promise.resolve({ id: 'new' }),
  deleteDoc: () => {
    store.updates.push({ deleted: true });
    return Promise.resolve();
  },
  deleteField: () => '__deleted__',
}));

describe('TournamentService.replaceParticipant', () => {
  const admin = { role: 'admin' as const, id: 'admin', displayName: 'Admin' };
  let service: TournamentService;

  beforeEach(() => {
    store.updates.length = 0;
    store.owned = 0;
    store.data = {
      teamSize: 2,
      slots: 8,
      organizerId: 'o1',
      winners: [{ place: 1, name: '@Alice & @Bob' }],
      registrations: [
        { platoId: 'Alice', partnerPlatoId: 'Bob', registeredAt: 1 },
        { platoId: 'Cara', partnerPlatoId: 'Dan', registeredAt: 2 },
      ],
      forgeState: {
        members: ['Alice & Bob', 'Cara & Dan'],
        bracket: {
          thirdPlaceEnabled: true,
          stages: [
            {
              label: 'Final Match',
              isThirdPlace: false,
              matches: [{ p1Name: 'Alice & Bob', p2Name: 'Cara & Dan', winnerName: 'Alice & Bob' }],
            },
          ],
        },
      },
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirestoreService,
          useValue: {
            db: {},
            getDoc: (ref: any) => firestore.getDoc(ref),
            getDocs: (q: any) => firestore.getDocs(q),
            updateDoc: (ref: any, patch: any) => firestore.updateDoc(ref, patch),
            addDoc: (ref: any, data: any) => firestore.addDoc(ref, data),
            deleteDoc: (ref: any) => firestore.deleteDoc(ref),
          },
        },
      ],
    });
    service = TestBed.inject(TournamentService);
  });

  it('updates registrations, members, bracket and winners together', async () => {
    const result = await service.replaceParticipant('t1', 0, 'Alice', 'Eve', admin);
    expect(result.ok).toBe(true);
    const patch = store.updates[0] as any;
    expect(patch.registrations[0]).toMatchObject({
      platoId: 'Alice',
      partnerPlatoId: 'Eve',
      registeredAt: 1,
    });
    expect(patch.forgeState.members).toEqual(['Alice & Eve', 'Cara & Dan']);
    expect(patch.forgeState.bracket.stages[0].matches[0]).toEqual({
      p1Name: 'Alice & Eve',
      p2Name: 'Cara & Dan',
      winnerName: 'Alice & Eve',
    });
    expect(patch.winners[0].name).toBe('@Alice & @Eve');
  });

  it('rejects duplicates and unauthorized users', async () => {
    expect((await service.replaceParticipant('t1', 0, 'Cara', 'Eve', admin)).ok).toBe(false);
    expect((await service.replaceParticipant('t1', 0, 'X', 'X', admin)).ok).toBe(false);
    const stranger = { role: 'organizer' as const, id: 'zzz', displayName: 'Z' };
    expect((await service.replaceParticipant('t1', 0, 'New', 'Eve', stranger)).ok).toBe(false);
    expect(store.updates.length).toBe(0);
  });

  it('clears the selected tournament data only', async () => {
    const ok = await service.clearData(
      't1',
      {
        registrations: true,
        forgeState: true,
        winners: false,
        closingMessage: false,
        details: false,
      },
      admin,
    );
    expect(ok).toBe(true);
    const patch = store.updates[0] as any;
    expect(patch.registrations).toEqual([]);
    expect(patch.forgeState).toBe('__deleted__');
    expect(patch.winners).toBeUndefined();
    const stranger = { role: 'organizer' as const, id: 'zzz', displayName: 'Z' };
    expect(
      await service.clearData(
        't1',
        {
          registrations: true,
          forgeState: false,
          winners: false,
          closingMessage: false,
          details: false,
        },
        stranger,
      ),
    ).toBe(false);
  });

  it('lets staff add a participant, enforcing slots, duplicates and permissions', async () => {
    const added = await service.addParticipant('t1', 'Fay', 'Gus', admin);
    expect(added).toEqual({ ok: true, message: 'Participant added.' });
    const patch = store.updates[0] as any;
    expect(patch.registrations.length).toBe(3);
    expect(patch.registrations[2]).toMatchObject({ platoId: 'Fay', partnerPlatoId: 'Gus' });

    expect((await service.addParticipant('t1', 'Alice', 'Zed', admin)).ok).toBe(false);
    store.data = { ...store.data, slots: 4 };
    expect((await service.addParticipant('t1', 'New', 'Pair', admin)).ok).toBe(false);
    store.data = { ...store.data, slots: 8 };
    const stranger = { role: 'organizer' as const, id: 'zzz', displayName: 'Z' };
    expect((await service.addParticipant('t1', 'New', 'Pair', stranger)).ok).toBe(false);
    expect((await service.addParticipant('t1', 'New', 'Pair', null)).ok).toBe(false);
    expect(store.updates.length).toBe(1);
  });

  it('adds several participants at once and reports what was skipped', async () => {
    const result = await service.addParticipants(
      't1',
      [
        { platoId: 'Fay', partnerPlatoId: 'Gus' },
        { platoId: 'Alice', partnerPlatoId: 'Zed' },
        { platoId: 'Hal', partnerPlatoId: '' },
        { platoId: 'Ivy', partnerPlatoId: 'Jon' },
        { platoId: 'Kim', partnerPlatoId: 'Lee' },
      ],
      admin,
    );
    expect(result.added).toBe(2);
    expect(result.skipped.map((s) => s.reason)).toEqual([
      'Already registered.',
      'Missing partner Plato ID.',
      'No slots left.',
    ]);
    expect((store.updates[0] as any).registrations.length).toBe(4);
    expect((await service.addParticipants('t1', [], null)).ok).toBe(false);
    const organizer = { role: 'organizer' as const, id: 'o1', displayName: 'Bella' };
    const denied = await service.addParticipants(
      't1',
      [{ platoId: 'Zed', partnerPlatoId: 'Yan' }],
      organizer,
    );
    expect(denied.ok).toBe(false);
    expect(denied.message).toContain('Only an admin');
    expect(store.updates.length).toBe(1);
  });

  const organizer = { role: 'organizer' as const, id: 'o1', displayName: 'Bella' };

  it('lets organizers change only results on a locked tournament', async () => {
    store.data['locked'] = true;
    expect(await service.update('t1', { title: 'New' }, organizer)).toBeNull();
    expect(
      await service.update('t1', { winners: [], closingMessage: 'GG' }, organizer),
    ).not.toBeNull();
    expect(await service.update('t1', { completed: true }, organizer)).not.toBeNull();
    expect(await service.update('t1', { locked: false }, organizer)).toBeNull();
    expect(store.updates.length).toBe(2);
    expect(await service.update('t1', { locked: false, title: 'Edit' }, admin)).not.toBeNull();
  });

  it('only lets an admin delete or unlock, and relocks when an organizer republishes', async () => {
    store.data['locked'] = true;
    expect(await service.remove('t1', organizer)).toBe(false);
    expect(await service.remove('t1', admin)).toBe(true);

    store.data['locked'] = false;
    const edited = await service.update('t1', { title: 'Edit', locked: true }, organizer);
    expect(edited?.locked).toBe(true);
    expect(await service.remove('t1', organizer)).toBe(true);
  });

  it('enforces the tournament limit set for an organizer', async () => {
    store.data['maxTournaments'] = 1;
    store.owned = 1;
    expect((await service.quota(organizer)).reached).toBe(true);
    await expect(
      service.create(
        {
          title: 'T',
          game: 'Carrom',
          slots: 8,
          teamSize: 1,
          announcement: '',
          details: '',
          sponsor: '',
          closingMessage: '',
          winners: [],
          hosts: [],
          startUTC: 1,
          createdTZ: 'UTC',
        },
        organizer,
      ),
    ).rejects.toBeInstanceOf(TournamentLimitError);

    store.data['maxTournaments'] = 0;
    expect((await service.quota(organizer)).reached).toBe(false);
    expect((await service.quota(admin)).reached).toBe(false);
  });

  it('does not let organizers clear tournament data', async () => {
    expect(
      await service.clearData(
        't1',
        {
          registrations: true,
          forgeState: false,
          winners: false,
          closingMessage: false,
          details: false,
        },
        organizer,
      ),
    ).toBe(false);
    expect(store.updates.length).toBe(0);
  });

  it('keeps a tournament unlocked until the organizer publishes it again', async () => {
    store.data['locked'] = false;
    await service.update('t1', { winners: [], closingMessage: 'GG' }, organizer);
    await service.update('t1', { completed: true }, organizer);
    await service.update('t1', { title: 'Edit', announcement: 'More' }, organizer);
    expect(store.updates.every((patch) => !('locked' in patch))).toBe(true);
    await service.update('t1', { title: 'Edit', locked: true }, organizer);
    expect(store.updates.at(-1)?.['locked']).toBe(true);
  });

  it('deletes several tournaments completely for an admin only', async () => {
    expect(await service.removeMany(['t1', 't2'], organizer)).toBe(0);
    expect(store.updates.length).toBe(0);
    expect(await service.removeMany(['t1', 't2'], admin)).toBe(2);
    expect(store.updates.filter((patch) => patch['deleted']).length).toBe(2);
  });

  it('refuses public registration until it opens, but lets staff add participants', async () => {
    store.data = { ...store.data, registrationOpensAt: Date.now() + 3600_000 };
    const early = await service.register('t1', 'Fay', 'Gus');
    expect(early.ok).toBe(false);
    expect(early.message).toContain("hasn't opened yet");
    expect(store.updates.length).toBe(0);

    expect((await service.addParticipant('t1', 'Fay', 'Gus', admin)).ok).toBe(true);

    store.updates.length = 0;
    store.data = { ...store.data, registrationOpensAt: Date.now() - 1000 };
    expect((await service.register('t1', 'Hal', 'Ida')).ok).toBe(true);
  });

  it('lets an unlocked tournament change when registration opens and clear it again', async () => {
    store.data['locked'] = false;
    const opens = Date.now() + 7200_000;
    const updated = await service.update('t1', { registrationOpensAt: opens }, organizer);
    expect(updated?.registrationOpensAt).toBe(opens);
    const cleared = await service.update('t1', { registrationOpensAt: 0 }, organizer);
    expect(cleared?.registrationOpensAt).toBe(0);
  });
});
