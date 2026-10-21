import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAX_CHAT_TEXT, MAX_INBOX_MESSAGES } from '../config/constants';
import { Session } from '../models/models';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';
import { InboxService } from './inbox.service';

const db = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>() }));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _col: string, id: string) => ({ id }),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
}));

describe('InboxService', () => {
  const admin: Session = { role: 'admin', id: 'admin', displayName: 'Admin' };
  const bella: Session = { role: 'organizer', id: 'o1', displayName: 'Bella' };
  const session = signal<Session | null>(null);
  let inbox: InboxService;

  beforeEach(() => {
    db.docs.clear();
    session.set(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { session } },
        {
          provide: FirestoreService,
          useValue: {
            db: {},
            getDoc: async (ref: { id: string }) => ({
              exists: () => db.docs.has(ref.id),
              data: () => db.docs.get(ref.id),
            }),
            getDocs: async () => ({
              docs: [...db.docs.values()].map((data) => ({ data: () => data })),
            }),
            setDoc: async (ref: { id: string }, data: Record<string, unknown>) => {
              db.docs.set(ref.id, data);
            },
            deleteDoc: async (ref: { id: string }) => {
              db.docs.delete(ref.id);
            },
            updateDoc: async (ref: { id: string }, data: Record<string, unknown>) => {
              db.docs.set(ref.id, { ...db.docs.get(ref.id), ...data });
            },
          },
        },
      ],
    });
    inbox = TestBed.inject(InboxService);
  });

  it('stores an organizer message and flags it unread for the admin', async () => {
    session.set(bella);
    expect(await inbox.send('  Can you unlock my tournament?  ')).toBe(true);

    const stored = db.docs.get('o1') as { messages: { from: string; text: string }[] };
    expect(stored.messages.map((m) => [m.from, m.text])).toEqual([
      ['organizer', 'Can you unlock my tournament?'],
    ]);
    expect(stored).toMatchObject({
      adminUnread: true,
      organizerUnread: false,
      organizerName: 'Bella',
    });

    expect(await inbox.send('   ')).toBe(false);
    expect(await inbox.send('x'.repeat(MAX_CHAT_TEXT + 50))).toBe(true);
    expect(inbox.myThread()?.messages.at(-1)?.text.length).toBe(MAX_CHAT_TEXT);
  });

  it('lets the admin read, reply and mark a thread read, which the organizer then sees', async () => {
    session.set(bella);
    await inbox.send('Hello');

    session.set(admin);
    await inbox.loadThreads();
    expect(inbox.threads()?.length).toBe(1);
    expect(inbox.unread()).toBe(1);

    expect(await inbox.reply('o1', 'Hi Bella')).toBe(true);
    expect(inbox.unread()).toBe(0);
    expect(inbox.threads()?.[0].messages.map((m) => m.from)).toEqual(['organizer', 'admin']);
    expect(db.docs.get('o1')).toMatchObject({ organizerUnread: true, adminUnread: false });

    session.set(bella);
    await inbox.loadMine();
    expect(inbox.unread()).toBe(1);
    await inbox.markRead();
    expect(inbox.unread()).toBe(0);
    expect(db.docs.get('o1')).toMatchObject({ organizerUnread: false });
  });

  it('keeps conversations separate and only lets an admin load or reply to others', async () => {
    session.set(bella);
    await inbox.send('From Bella');
    session.set({ role: 'organizer', id: 'o2', displayName: 'Ben' });
    await inbox.send('From Ben');
    expect(await inbox.reply('o1', 'sneaky')).toBe(false);
    await inbox.loadThreads();
    expect(inbox.threads()).toBeUndefined();

    session.set(admin);
    await inbox.loadThreads();
    expect(
      inbox
        .threads()
        ?.map((t) => t.organizerName)
        .sort(),
    ).toEqual(['Bella', 'Ben']);
    expect(inbox.unread()).toBe(2);
    await inbox.markRead('o1');
    expect(inbox.unread()).toBe(1);
  });

  it('only keeps the most recent messages in a thread', async () => {
    session.set(bella);
    for (let i = 0; i < MAX_INBOX_MESSAGES + 5; i++) await inbox.send(`msg ${i}`);
    const messages = inbox.myThread()?.messages ?? [];
    expect(messages.length).toBe(MAX_INBOX_MESSAGES);
    expect(messages.at(-1)?.text).toBe(`msg ${MAX_INBOX_MESSAGES + 4}`);
  });

  it('lets only the admin delete a single message or a whole conversation', async () => {
    session.set(bella);
    await inbox.send('first');
    await inbox.send('second');
    const [first] = inbox.myThread()?.messages ?? [];
    expect(await inbox.deleteMessage('o1', first.id)).toBe(false);
    expect(await inbox.deleteThread('o1')).toBe(false);
    expect(db.docs.has('o1')).toBe(true);

    session.set(admin);
    await inbox.loadThreads();
    expect(await inbox.deleteMessage('o1', first.id)).toBe(true);
    expect(inbox.threads()?.[0].messages.map((m) => m.text)).toEqual(['second']);
    expect((db.docs.get('o1') as { messages: unknown[] }).messages.length).toBe(1);

    const [last] = inbox.threads()?.[0].messages ?? [];
    expect(await inbox.deleteMessage('o1', last.id)).toBe(true);
    expect(db.docs.has('o1')).toBe(false);
    expect(inbox.threads()).toEqual([]);
    expect(inbox.unread()).toBe(0);
  });

  it('deletes a conversation outright', async () => {
    session.set(bella);
    await inbox.send('hello');
    session.set(admin);
    await inbox.loadThreads();
    expect(await inbox.deleteThread('o1')).toBe(true);
    expect(db.docs.size).toBe(0);
    expect(inbox.threads()).toEqual([]);
  });
});
