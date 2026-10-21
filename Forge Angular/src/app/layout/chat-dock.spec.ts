import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ADMIN_PEER_ID } from '../core/config/constants';
import { Session } from '../core/models/models';
import { AuthService } from '../core/services/auth.service';
import { PEER_FACTORY } from '../core/services/chat-transport';
import { InboxService } from '../core/services/inbox.service';
import { LiveChatService } from '../core/services/live-chat.service';
import { FakePeerHub, flush } from '../core/services/testing/fake-peers';
import { ChatDock } from './chat-dock';

describe('ChatDock', () => {
  const hub = new FakePeerHub();
  const session = signal<Session | null>(null);
  const unread = signal(0);

  beforeEach(() => {
    hub.peers.clear();
    session.set(null);
    unread.set(0);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session } },
        { provide: PEER_FACTORY, useValue: hub.factory },
        { provide: InboxService, useValue: { unread } },
      ],
    });
  });

  const text = (root: HTMLElement) => (root.textContent ?? '').replace(/\s+/g, ' ');
  const press = async (
    fixture: { whenStable(): Promise<unknown> },
    root: HTMLElement,
    label: string,
  ) => {
    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    expect(button, label).toBeDefined();
    button?.click();
    await flush();
    await fixture.whenStable();
  };

  it('is hidden for visitors and appears once someone is logged in', async () => {
    const fixture = TestBed.createComponent(ChatDock);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(root.querySelector('.fab')).toBeNull();

    session.set({ role: 'organizer', id: 'o1', displayName: 'Bella' });
    await fixture.whenStable();
    expect(root.querySelector('.fab')).not.toBeNull();
  });

  it('walks an organizer and the admin through a request, accept, chat and close', async () => {
    const adminFixture = TestBed.createComponent(ChatDock);
    const admin = adminFixture.nativeElement as HTMLElement;
    session.set({ role: 'admin', id: 'admin', displayName: 'Admin' });
    await adminFixture.whenStable();
    await flush();
    const adminChat = TestBed.inject(LiveChatService);
    expect(hub.peers.has(ADMIN_PEER_ID)).toBe(true);
    expect(adminChat.adminLink()).toBe('ready');

    const organizerPeer = await hub.factory();
    await flush();
    const conn = organizerPeer.connect(ADMIN_PEER_ID);
    await flush();
    conn.send({ t: 'hello', id: 'o1', name: 'Bella' });
    await flush();
    await adminFixture.whenStable();
    expect(admin.querySelector('.badge')?.textContent?.trim()).toBe('1');
    expect(admin.querySelector('.fab')?.classList.contains('alert')).toBe(true);

    await press(adminFixture, admin, '💬');
    expect(text(admin)).toContain('Bella');
    await press(adminFixture, admin, 'Bella');
    expect(text(admin)).toContain('asked for a live chat');
    await press(adminFixture, admin, 'Start chat');
    expect(admin.querySelector('textarea')?.getAttribute('placeholder')).toBe('Message Bella');

    conn.send({ t: 'msg', text: 'hello from Bella' });
    await flush();
    await adminFixture.whenStable();
    expect(text(admin)).toContain('hello from Bella');
    expect(admin.querySelector('textarea')).not.toBeNull();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await press(adminFixture, admin, 'Close chat');
    expect(confirmSpy.mock.calls[0][0]).toContain('not saved');
    expect(adminChat.chats()).toEqual([]);
    confirmSpy.mockRestore();
  });

  it('shows organizers a request button, the privacy note and the waiting state', async () => {
    const fixture = TestBed.createComponent(ChatDock);
    const root = fixture.nativeElement as HTMLElement;
    session.set({ role: 'organizer', id: 'o1', displayName: 'Bella' });
    await fixture.whenStable();
    await press(fixture, root, '💬');
    expect(text(root)).toContain('never saved');
    expect(text(root)).toContain('Request live chat');
    expect(text(root)).not.toContain('Close chat');

    await press(fixture, root, 'Request live chat');
    await flush();
    await fixture.whenStable();
    expect(text(root)).toContain('admin isn’t online');
    expect(text(root)).toContain('Leave a message');
  });
});
