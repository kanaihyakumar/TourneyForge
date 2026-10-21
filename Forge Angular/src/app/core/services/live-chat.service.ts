import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import {
  ADMIN_PEER_ID,
  CHAT_CONNECT_TIMEOUT_MS,
  MAX_CHAT_LINES,
  MAX_CHAT_TEXT,
} from '../config/constants';
import { ChatLine } from '../models/models';
import { AuthService } from './auth.service';
import { ChatConnection, ChatPeer, ChatWire, parseWire, PEER_FACTORY } from './chat-transport';

export type AdminChatStatus = 'pending' | 'active' | 'disconnected';
export type OrganizerChatStatus =
  'idle' | 'connecting' | 'waiting' | 'active' | 'closed' | 'lost' | 'unavailable';
export type AdminLinkStatus = 'off' | 'starting' | 'ready' | 'taken' | 'error';

export interface AdminChat {
  id: string;
  organizerId: string;
  organizerName: string;
  status: AdminChatStatus;
  lines: ChatLine[];
  unread: number;
  since: number;
}

const ADMIN_RETRY_MS = 15_000;
const ADMIN_TAKEN_RETRY_MS = 5_000;
const CLOSE_DELAY_MS = 300;

@Injectable({ providedIn: 'root' })
export class LiveChatService {
  private readonly auth = inject(AuthService);
  private readonly makePeer = inject(PEER_FACTORY);

  readonly dockOpen = signal(false);

  readonly adminLink = signal<AdminLinkStatus>('off');
  readonly chats = signal<AdminChat[]>([]);
  readonly selectedId = signal<string | null>(null);

  readonly status = signal<OrganizerChatStatus>('idle');
  readonly lines = signal<ChatLine[]>([]);
  readonly organizerUnread = signal(0);

  readonly pending = computed(() => this.chats().filter((c) => c.status === 'pending'));
  readonly selected = computed(() => this.chats().find((c) => c.id === this.selectedId()) ?? null);
  readonly attention = computed(() => {
    if (this.auth.session()?.role === 'admin') {
      return this.chats().reduce((sum, c) => sum + (c.status === 'pending' ? 1 : c.unread), 0);
    }
    return this.organizerUnread();
  });

  private nextLine = 0;
  private adminPeer: ChatPeer | null = null;
  private adminStarting = false;
  private adminTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly connections = new Map<string, ChatConnection>();

  private orgPeer: ChatPeer | null = null;
  private orgConn: ChatConnection | null = null;
  private orgTimer: ReturnType<typeof setTimeout> | undefined;
  private orgRun = 0;

  private readonly identity = computed(() => {
    const session = this.auth.session();
    return session ? `${session.role}:${session.id}` : '';
  });

  constructor() {
    effect(() => {
      const identity = this.identity();
      untracked(() => {
        const role = identity.split(':')[0];
        if (role === 'admin') void this.startAdmin();
        else this.stopAdmin();
        this.resetOrganizer();
      });
    });
  }

  setDock(open: boolean): void {
    this.dockOpen.set(open);
    if (!open) return;
    this.organizerUnread.set(0);
    const id = this.selectedId();
    if (id) this.clearUnread(id);
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.clearUnread(id);
  }

  async startAdmin(): Promise<void> {
    if (this.adminPeer || this.adminStarting) return;
    this.adminStarting = true;
    this.adminLink.set('starting');
    try {
      const peer = await this.makePeer(ADMIN_PEER_ID);
      if (this.auth.session()?.role !== 'admin') {
        peer.destroy();
        return;
      }
      this.adminPeer = peer;
      peer.on('open', () => this.adminLink.set('ready'));
      peer.on('connection', (conn) => this.acceptConnection(conn));
      peer.on('disconnected', () => {
        if (this.adminPeer === peer) peer.reconnect?.();
      });
      peer.on('error', (err) => {
        const taken = err?.type === 'unavailable-id';
        this.adminLink.set(taken ? 'taken' : 'error');
        this.releaseAdminPeer(peer);
        this.scheduleAdminRetry(taken ? ADMIN_TAKEN_RETRY_MS : ADMIN_RETRY_MS);
      });
    } catch {
      this.adminLink.set('error');
      this.scheduleAdminRetry(ADMIN_RETRY_MS);
    } finally {
      this.adminStarting = false;
    }
  }

  stopAdmin(): void {
    clearTimeout(this.adminTimer);
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.adminPeer) this.adminPeer.destroy();
    this.adminPeer = null;
    this.adminLink.set('off');
    this.chats.set([]);
    this.selectedId.set(null);
  }

  accept(id: string): void {
    const chat = this.chats().find((c) => c.id === id);
    const conn = this.connections.get(id);
    if (!chat || !conn || chat.status !== 'pending') return;
    this.patchChat(id, { status: 'active' });
    this.safeSend(conn, { t: 'accepted' });
    this.selectedId.set(id);
    this.clearUnread(id);
  }

  sendAsAdmin(id: string, text: string): void {
    const chat = this.chats().find((c) => c.id === id);
    const conn = this.connections.get(id);
    const clean = text.trim().slice(0, MAX_CHAT_TEXT);
    if (!chat || chat.status !== 'active' || !conn || !clean) return;
    this.safeSend(conn, { t: 'msg', text: clean });
    this.pushAdminLine(id, true, clean);
  }

  closeChat(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      this.safeSend(conn, { t: 'closed' });
      setTimeout(() => conn.close(), CLOSE_DELAY_MS);
    }
    this.removeChat(id);
  }

  async requestChat(): Promise<void> {
    const session = this.auth.session();
    if (session?.role !== 'organizer') return;
    if (!['idle', 'closed', 'lost', 'unavailable'].includes(this.status())) return;
    this.resetOrganizer();
    const run = ++this.orgRun;
    this.status.set('connecting');
    let peer: ChatPeer;
    try {
      peer = await this.makePeer();
    } catch {
      if (run === this.orgRun) this.status.set('unavailable');
      return;
    }
    if (run !== this.orgRun) {
      peer.destroy();
      return;
    }
    this.orgPeer = peer;
    peer.on('error', () => {
      if (run !== this.orgRun) return;
      this.endOrganizer(this.status() === 'active' ? 'lost' : 'unavailable');
    });
    peer.on('open', () => {
      if (run !== this.orgRun) return;
      const conn = peer.connect(ADMIN_PEER_ID, { reliable: true });
      this.orgConn = conn;
      this.orgTimer = setTimeout(() => {
        if (run === this.orgRun && this.status() === 'connecting') this.endOrganizer('unavailable');
      }, CHAT_CONNECT_TIMEOUT_MS);
      conn.on('open', () => {
        if (run !== this.orgRun) return;
        clearTimeout(this.orgTimer);
        this.safeSend(conn, { t: 'hello', id: session.id, name: session.displayName });
        this.status.set('waiting');
      });
      conn.on('data', (raw) => {
        if (run === this.orgRun) this.onOrganizerData(raw);
      });
      const dropped = () => {
        if (run !== this.orgRun) return;
        const current = this.status();
        if (current === 'active' || current === 'waiting') this.endOrganizer('lost');
      };
      conn.on('close', dropped);
      conn.on('error', dropped);
    });
  }

  cancelRequest(): void {
    const status = this.status();
    if (status !== 'connecting' && status !== 'waiting') return;
    if (this.orgConn) this.safeSend(this.orgConn, { t: 'cancel' });
    const conn = this.orgConn;
    this.orgRun++;
    setTimeout(() => conn?.close(), CLOSE_DELAY_MS);
    this.endOrganizer('idle');
  }

  sendAsOrganizer(text: string): void {
    const clean = text.trim().slice(0, MAX_CHAT_TEXT);
    if (this.status() !== 'active' || !this.orgConn || !clean) return;
    this.safeSend(this.orgConn, { t: 'msg', text: clean });
    this.lines.update((lines) => this.appendLine(lines, true, clean));
  }

  dismissOrganizerChat(): void {
    this.resetOrganizer();
  }

  private acceptConnection(conn: ChatConnection): void {
    conn.on('data', (raw) => this.onAdminData(conn, raw));
    const gone = () => this.onAdminConnectionClosed(conn);
    conn.on('close', gone);
    conn.on('error', gone);
  }

  private onAdminData(conn: ChatConnection, raw: unknown): void {
    const wire = parseWire(raw);
    if (!wire) return;
    const id = conn.peer;
    if (wire.t === 'hello') {
      const organizerId = wire.id.slice(0, 80);
      const previous = this.chats().find((c) => c.organizerId === organizerId && c.id !== id);
      if (previous) {
        this.connections.get(previous.id)?.close();
        this.removeChat(previous.id);
      }
      if (this.chats().some((c) => c.id === id)) return;
      this.connections.set(id, conn);
      this.chats.update((chats) => [
        ...chats,
        {
          id,
          organizerId,
          organizerName: wire.name.slice(0, 60) || 'Organizer',
          status: 'pending',
          lines: [],
          unread: 0,
          since: Date.now(),
        },
      ]);
      this.safeSend(conn, { t: 'queued' });
      return;
    }
    const chat = this.chats().find((c) => c.id === id);
    if (!chat) return;
    if (wire.t === 'msg' && chat.status === 'active') {
      this.pushAdminLine(id, false, wire.text.slice(0, MAX_CHAT_TEXT));
    } else if (wire.t === 'cancel' && chat.status === 'pending') {
      this.removeChat(id);
      conn.close();
    }
  }

  private onAdminConnectionClosed(conn: ChatConnection): void {
    const chat = this.chats().find((c) => c.id === conn.peer);
    if (!chat || this.connections.get(conn.peer) !== conn) return;
    if (chat.status === 'pending') this.removeChat(chat.id);
    else this.patchChat(chat.id, { status: 'disconnected' });
  }

  private pushAdminLine(id: string, mine: boolean, text: string): void {
    const viewing = this.dockOpen() && this.selectedId() === id;
    this.chats.update((chats) =>
      chats.map((c) =>
        c.id === id
          ? {
              ...c,
              lines: this.appendLine(c.lines, mine, text),
              unread: mine || viewing ? c.unread : c.unread + 1,
            }
          : c,
      ),
    );
  }

  private appendLine(lines: ChatLine[], mine: boolean, text: string): ChatLine[] {
    return [...lines, { id: this.nextLine++, mine, text, at: Date.now() }].slice(-MAX_CHAT_LINES);
  }

  private patchChat(id: string, patch: Partial<AdminChat>): void {
    this.chats.update((chats) => chats.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  private clearUnread(id: string): void {
    if (this.chats().some((c) => c.id === id && c.unread)) this.patchChat(id, { unread: 0 });
  }

  private removeChat(id: string): void {
    this.connections.delete(id);
    this.chats.update((chats) => chats.filter((c) => c.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  private releaseAdminPeer(peer: ChatPeer): void {
    if (this.adminPeer === peer) this.adminPeer = null;
    peer.destroy();
  }

  private scheduleAdminRetry(delay: number): void {
    clearTimeout(this.adminTimer);
    this.adminTimer = setTimeout(() => {
      if (this.auth.session()?.role === 'admin') void this.startAdmin();
    }, delay);
  }

  private onOrganizerData(raw: unknown): void {
    const wire = parseWire(raw);
    if (!wire) return;
    if (wire.t === 'accepted') {
      this.status.set('active');
      if (!this.dockOpen()) this.organizerUnread.update((n) => n + 1);
    } else if (wire.t === 'msg' && this.status() === 'active') {
      const text = wire.text.slice(0, MAX_CHAT_TEXT);
      this.lines.update((lines) => this.appendLine(lines, false, text));
      if (!this.dockOpen()) this.organizerUnread.update((n) => n + 1);
    } else if (wire.t === 'closed') {
      this.endOrganizer('closed');
    }
  }

  private endOrganizer(status: OrganizerChatStatus): void {
    clearTimeout(this.orgTimer);
    this.orgPeer?.destroy();
    this.orgPeer = null;
    this.orgConn = null;
    if (status === 'idle') this.lines.set([]);
    this.status.set(status);
  }

  private resetOrganizer(): void {
    this.orgRun++;
    clearTimeout(this.orgTimer);
    this.orgConn?.close();
    this.orgPeer?.destroy();
    this.orgPeer = null;
    this.orgConn = null;
    this.status.set('idle');
    this.lines.set([]);
    this.organizerUnread.set(0);
  }

  private safeSend(conn: ChatConnection, data: ChatWire): void {
    try {
      conn.send(data);
    } catch (err) {
      console.error(err);
    }
  }
}
