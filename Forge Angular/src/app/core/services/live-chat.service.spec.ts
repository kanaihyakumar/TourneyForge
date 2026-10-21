import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ADMIN_PEER_ID, MAX_CHAT_TEXT } from '../config/constants';
import { Session } from '../models/models';
import { AuthService } from './auth.service';
import { PEER_FACTORY } from './chat-transport';
import { LiveChatService } from './live-chat.service';
import { FakePeerHub, flush } from './testing/fake-peers';

describe('LiveChatService', () => {
  let hub: FakePeerHub;
  const admin: Session = { role: 'admin', id: 'admin', displayName: 'Admin' };
  const org = (id: string, name: string): Session => ({
    role: 'organizer',
    id,
    displayName: name,
  });

  const make = (session: Session | null) => {
    const auth = { session: signal<Session | null>(session) };
    const injector = createEnvironmentInjector(
      [
        LiveChatService,
        { provide: AuthService, useValue: auth },
        { provide: PEER_FACTORY, useValue: hub.factory },
      ],
      TestBed.inject(EnvironmentInjector),
    );
    const service = injector.get(LiveChatService);
    TestBed.tick();
    return { service, auth };
  };

  beforeEach(() => {
    hub = new FakePeerHub();
  });

  it('runs a request, accept, chat and close cycle that only the admin can end', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    expect(adminChat.adminLink()).toBe('ready');
    expect(hub.peers.has(ADMIN_PEER_ID)).toBe(true);

    const { service: orgChat } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    expect(orgChat.status()).toBe('waiting');
    expect(adminChat.pending().map((c) => c.organizerName)).toEqual(['Bella']);
    expect(adminChat.attention()).toBe(1);

    const id = adminChat.pending()[0].id;
    adminChat.accept(id);
    await flush();
    expect(orgChat.status()).toBe('active');
    expect(adminChat.selectedId()).toBe(id);
    expect(adminChat.pending().length).toBe(0);

    orgChat.sendAsOrganizer('hello admin');
    await flush();
    expect(adminChat.selected()?.lines.map((l) => [l.mine, l.text])).toEqual([
      [false, 'hello admin'],
    ]);
    expect(orgChat.lines().map((l) => [l.mine, l.text])).toEqual([[true, 'hello admin']]);

    adminChat.sendAsAdmin(id, 'hi Bella');
    await flush();
    expect(orgChat.lines().map((l) => [l.mine, l.text])).toEqual([
      [true, 'hello admin'],
      [false, 'hi Bella'],
    ]);
    expect(orgChat.organizerUnread()).toBe(2);

    adminChat.closeChat(id);
    await flush();
    expect(adminChat.chats()).toEqual([]);
    expect(orgChat.status()).toBe('closed');
    expect(orgChat.lines().length).toBe(2);
    orgChat.sendAsOrganizer('still there?');
    expect(orgChat.lines().length).toBe(2);
  });

  it('handles several organizers at once and routes messages separately', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    const { service: a } = make(org('o1', 'Ann'));
    const { service: b } = make(org('o2', 'Ben'));
    await a.requestChat();
    await b.requestChat();
    await flush();

    expect(adminChat.pending().map((c) => c.organizerName)).toEqual(['Ann', 'Ben']);
    expect(adminChat.attention()).toBe(2);

    const [annId, benId] = adminChat.pending().map((c) => c.id);
    adminChat.accept(benId);
    await flush();
    expect(b.status()).toBe('active');
    expect(a.status()).toBe('waiting');

    adminChat.accept(annId);
    await flush();
    a.sendAsOrganizer('from Ann');
    b.sendAsOrganizer('from Ben');
    await flush();
    const byName = (name: string) => adminChat.chats().find((c) => c.organizerName === name);
    expect(byName('Ann')?.lines.map((l) => l.text)).toEqual(['from Ann']);
    expect(byName('Ben')?.lines.map((l) => l.text)).toEqual(['from Ben']);

    adminChat.sendAsAdmin(annId, 'only Ann');
    await flush();
    expect(a.lines().at(-1)?.text).toBe('only Ann');
    expect(b.lines().some((l) => l.text === 'only Ann')).toBe(false);

    adminChat.closeChat(annId);
    await flush();
    expect(a.status()).toBe('closed');
    expect(b.status()).toBe('active');
  });

  it('counts unread lines until the admin looks at that chat', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    const { service: orgChat } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    const id = adminChat.pending()[0].id;
    adminChat.accept(id);
    await flush();
    orgChat.sendAsOrganizer('one');
    orgChat.sendAsOrganizer('two');
    await flush();
    expect(adminChat.selected()?.unread).toBe(2);
    expect(adminChat.attention()).toBe(2);

    adminChat.select(id);
    expect(adminChat.attention()).toBe(0);
  });

  it('lets an organizer cancel a request that has not been accepted', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    const { service: orgChat } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    expect(adminChat.chats().length).toBe(1);

    orgChat.cancelRequest();
    await flush();
    expect(orgChat.status()).toBe('idle');
    expect(adminChat.chats()).toEqual([]);
  });

  it('keeps a dropped chat in the list until the admin closes it', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    const { service: orgChat } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    const id = adminChat.pending()[0].id;
    adminChat.accept(id);
    await flush();

    hub.peers.forEach((peer, key) => key !== ADMIN_PEER_ID && peer.destroy());
    await flush();
    expect(adminChat.chats()[0].status).toBe('disconnected');
    expect(orgChat.status()).toBe('lost');
    adminChat.closeChat(id);
    expect(adminChat.chats()).toEqual([]);
  });

  it('tells an organizer when the admin is offline', async () => {
    const { service: orgChat } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    expect(orgChat.status()).toBe('unavailable');

    hub.failNext = new Error('network');
    await orgChat.requestChat();
    expect(orgChat.status()).toBe('unavailable');
  });

  it('flags a second admin window and ignores malformed or oversized data', async () => {
    const { service: adminChat } = make(admin);
    await flush();
    const { service: second } = make(admin);
    await flush();
    expect(second.adminLink()).toBe('taken');

    const intruder = await hub.factory();
    await flush();
    const conn = intruder.connect(ADMIN_PEER_ID);
    await flush();
    conn.send('garbage');
    conn.send({ t: 'msg', text: 'before hello' });
    conn.send({ t: 'hello', id: 'o9', name: 'Mallory' });
    await flush();
    expect(adminChat.chats().length).toBe(1);
    const id = adminChat.chats()[0].id;
    expect(adminChat.chats()[0].lines).toEqual([]);

    conn.send({ t: 'msg', text: 'pending chats ignore this' });
    await flush();
    expect(adminChat.chats()[0].lines).toEqual([]);

    adminChat.accept(id);
    await flush();
    conn.send({ t: 'msg', text: 'x'.repeat(MAX_CHAT_TEXT * 3) });
    await flush();
    expect(adminChat.chats()[0].lines[0].text.length).toBe(MAX_CHAT_TEXT);
  });

  it('shuts everything down when the session ends', async () => {
    const { service: adminChat, auth } = make(admin);
    await flush();
    const { service: orgChat, auth: orgAuth } = make(org('o1', 'Bella'));
    await orgChat.requestChat();
    await flush();
    expect(adminChat.chats().length).toBe(1);

    orgAuth.session.set(null);
    TestBed.tick();
    await flush();
    expect(orgChat.status()).toBe('idle');
    expect(adminChat.chats()).toEqual([]);

    auth.session.set(null);
    TestBed.tick();
    expect(adminChat.adminLink()).toBe('off');
    expect(hub.peers.has(ADMIN_PEER_ID)).toBe(false);
  });
});
