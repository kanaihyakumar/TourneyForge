import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '../config/constants';
import { Session } from '../models/models';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { ToastService } from './toast.service';

const db = vi.hoisted(() => ({
  organizers: {} as Record<string, { password: string; displayName: string }>,
  signOutAt: 0,
  admin: { username: 'boss', password: 'secret1', displayName: 'Boss' } as Record<string, unknown>,
  writes: [] as { col: string; id: string; data: Record<string, unknown> }[],
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  collection: (_db: unknown, col: string) => ({ col }),
  query: (c: unknown, w: { value: string }) => ({ ...(c as object), value: w.value }),
  where: (_f: string, _o: string, value: string) => ({ value }),
}));

describe('AuthService', () => {
  const toasts: string[] = [];
  let auth: AuthService;

  const organizer = (over: Partial<Session> = {}): Session => ({
    role: 'organizer',
    id: 'o1',
    displayName: 'Bella',
    loginAt: 1000,
    ...over,
  });

  beforeEach(() => {
    localStorage.clear();
    toasts.length = 0;
    db.organizers = { o1: { password: 'pw', displayName: 'Bella' } };
    db.signOutAt = 0;
    db.admin = { username: 'boss', password: 'secret1', displayName: 'Boss' };
    db.writes = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: { show: (m: string) => toasts.push(m) } },
        {
          provide: FirestoreService,
          useValue: {
            db: {},
            getDoc: async (ref: { col: string; id: string }) => {
              if (ref.col === 'organizers') {
                const found = db.organizers[ref.id];
                return { exists: () => !!found, data: () => found };
              }
              if (ref.col === 'config' && ref.id === 'session') {
                return {
                  exists: () => db.signOutAt > 0,
                  data: () => ({ organizersLoggedOutAt: db.signOutAt }),
                };
              }
              return { exists: () => true, data: () => db.admin };
            },
            getDocs: async (q: { value: string }) => ({
              docs: Object.entries(db.organizers)
                .filter(([, o]) => o.password === q.value || q.value === 'bella')
                .map(([id, o]) => ({ id, data: () => ({ ...o, usernameLower: 'bella' }) })),
            }),
            setDoc: async (ref: { col: string; id: string }, data: Record<string, unknown>) => {
              db.writes.push({ ...ref, data });
              if (ref.id === 'session') db.signOutAt = Number(data['organizersLoggedOutAt']);
            },
            updateDoc: async (ref: { col: string; id: string }, data: Record<string, unknown>) => {
              db.writes.push({ ...ref, data });
              db.admin = { ...db.admin, ...data };
            },
          },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
  });

  const signIn = (session: Session) => {
    auth.session.set(session);
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  };

  it('keeps an active organizer signed in', async () => {
    signIn(organizer());
    expect(await auth.verifySession(true)).toBe(true);
    expect(auth.session()).not.toBeNull();
    expect(toasts).toEqual([]);
  });

  it('signs out an organizer the admin has removed', async () => {
    signIn(organizer());
    delete db.organizers['o1'];
    expect(await auth.verifySession(true)).toBe(false);
    expect(auth.session()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
    expect(toasts[0]).toContain('no longer active');
  });

  it('signs out organizers who logged in before the admin logged everyone out', async () => {
    signIn(organizer({ loginAt: 1000 }));
    db.signOutAt = 2000;
    expect(await auth.verifySession(true)).toBe(false);
    expect(auth.session()).toBeNull();
    expect(toasts[0]).toContain('signed out by the admin');

    signIn(organizer({ loginAt: 3000 }));
    expect(await auth.verifySession(true)).toBe(true);

    signIn(organizer({ loginAt: undefined }));
    expect(await auth.verifySession(true)).toBe(false);
  });

  it('reuses a recent check instead of asking the database every time', async () => {
    signIn(organizer());
    expect(await auth.verifySession(true)).toBe(true);
    delete db.organizers['o1'];
    expect(await auth.verifySession()).toBe(true);
    expect(await auth.verifySession(true)).toBe(false);
  });

  it('never signs the admin out, and lets only the admin log everyone out', async () => {
    signIn({ role: 'admin', id: 'admin', displayName: 'Boss' });
    db.signOutAt = Date.now() + 99999;
    expect(await auth.verifySession(true)).toBe(true);
    expect(await auth.logoutAllOrganizers()).toBe(true);
    expect(db.writes.at(-1)?.col).toBe('config');
    expect(Number(db.writes.at(-1)?.data['organizersLoggedOutAt'])).toBeGreaterThan(0);

    signIn(organizer());
    db.writes.length = 0;
    expect(await auth.logoutAllOrganizers()).toBe(false);
    expect(db.writes.length).toBe(0);
  });

  it('stamps the login time so a later sign-out-all does not catch a fresh login', async () => {
    const before = Date.now();
    const session = await auth.login('bella', 'pw');
    expect(session?.loginAt).toBeGreaterThanOrEqual(before);
    expect(auth.session()?.loginAt).toBe(session?.loginAt);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.session) ?? '{}').loginAt).toBe(
      session?.loginAt,
    );
    expect(await auth.verifySession(true)).toBe(true);
  });

  it('lets the admin change their own password after checking the current one', async () => {
    signIn({ role: 'admin', id: 'admin', displayName: 'Boss' });
    expect(await auth.changeAdminPassword('nope', 'newpass1')).toBe('wrong');
    expect(await auth.changeAdminPassword('secret1', 'abc')).toBe('weak');
    expect(db.admin['password']).toBe('secret1');

    expect(await auth.changeAdminPassword('secret1', 'newpass1')).toBe('ok');
    expect(db.admin['password']).toBe('newpass1');
    expect(db.admin['username']).toBe('boss');

    signIn(organizer());
    expect(await auth.changeAdminPassword('newpass1', 'another1')).toBe('denied');
    expect(db.admin['password']).toBe('newpass1');
  });
});
