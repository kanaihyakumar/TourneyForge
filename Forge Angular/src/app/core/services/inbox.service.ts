import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { collection, doc, query, where } from 'firebase/firestore';
import { INBOX_POLL_MS, MAX_CHAT_TEXT, MAX_INBOX_MESSAGES } from '../config/constants';
import { InboxMessage, InboxThread, MessageFrom, Session } from '../models/models';
import { AuthService } from './auth.service';
import { FirestoreService } from './firestore.service';

@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly firestore = inject(FirestoreService);
  private readonly auth = inject(AuthService);

  readonly threads = signal<InboxThread[] | undefined>(undefined);
  readonly myThread = signal<InboxThread | null | undefined>(undefined);
  readonly unread = signal(0);

  constructor() {
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') void this.refreshUnread();
    };
    effect(() => {
      const session = this.auth.session();
      untracked(() => {
        clearInterval(timer);
        this.threads.set(undefined);
        this.myThread.set(undefined);
        this.unread.set(0);
        if (!session) return;
        void this.refreshUnread();
        timer = setInterval(refresh, INBOX_POLL_MS);
      });
    });
    window.addEventListener('focus', refresh);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    });
  }

  private ref(id: string) {
    return doc(this.firestore.db, 'inbox', id);
  }

  async refreshUnread(): Promise<void> {
    const session = this.auth.session();
    if (!session) return;
    try {
      if (session.role === 'admin') {
        const snap = await this.firestore.getDocs(
          query(collection(this.firestore.db, 'inbox'), where('adminUnread', '==', true)),
        );
        this.unread.set(snap.docs.length);
      } else {
        await this.loadMine();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async loadThreads(): Promise<void> {
    if (this.auth.session()?.role !== 'admin') return;
    const snap = await this.firestore.getDocs(collection(this.firestore.db, 'inbox'));
    const threads = snap.docs
      .map((d) => d.data() as InboxThread)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    this.threads.set(threads);
    this.unread.set(threads.filter((t) => t.adminUnread).length);
  }

  async loadMine(): Promise<void> {
    const session = this.auth.session();
    if (session?.role !== 'organizer') return;
    const snap = await this.firestore.getDoc(this.ref(session.id));
    const thread = snap.exists() ? (snap.data() as InboxThread) : null;
    this.myThread.set(thread);
    this.unread.set(thread?.organizerUnread ? 1 : 0);
  }

  async send(text: string): Promise<boolean> {
    const session = this.auth.session();
    if (session?.role !== 'organizer') return false;
    const thread = await this.append(session.id, session.displayName, 'organizer', text, {
      adminUnread: true,
      organizerUnread: false,
    });
    if (thread) this.myThread.set(thread);
    return !!thread;
  }

  async reply(organizerId: string, text: string): Promise<boolean> {
    if (this.auth.session()?.role !== 'admin') return false;
    const known = this.threads()?.find((t) => t.organizerId === organizerId);
    const thread = await this.append(organizerId, known?.organizerName ?? '', 'admin', text, {
      adminUnread: false,
      organizerUnread: true,
    });
    if (thread) this.replaceThread(thread);
    return !!thread;
  }

  async markRead(organizerId?: string): Promise<void> {
    const session: Session | null = this.auth.session();
    if (!session) return;
    if (session.role === 'admin' && organizerId) {
      const thread = this.threads()?.find((t) => t.organizerId === organizerId);
      if (!thread?.adminUnread) return;
      await this.firestore.updateDoc(this.ref(organizerId), { adminUnread: false });
      this.replaceThread({ ...thread, adminUnread: false });
    } else if (session.role === 'organizer') {
      const thread = this.myThread();
      if (!thread?.organizerUnread) return;
      await this.firestore.updateDoc(this.ref(session.id), { organizerUnread: false });
      this.myThread.set({ ...thread, organizerUnread: false });
      this.unread.set(0);
    }
  }

  async deleteThread(organizerId: string): Promise<boolean> {
    if (this.auth.session()?.role !== 'admin') return false;
    await this.firestore.deleteDoc(this.ref(organizerId));
    this.dropThread(organizerId);
    return true;
  }

  async deleteMessage(organizerId: string, messageId: string): Promise<boolean> {
    if (this.auth.session()?.role !== 'admin') return false;
    const snap = await this.firestore.getDoc(this.ref(organizerId));
    if (!snap.exists()) {
      this.dropThread(organizerId);
      return true;
    }
    const existing = snap.data() as InboxThread;
    const messages = existing.messages.filter((m) => m.id !== messageId);
    if (!messages.length) return this.deleteThread(organizerId);
    const thread: InboxThread = { ...existing, messages };
    await this.firestore.updateDoc(this.ref(organizerId), { messages });
    this.replaceThread(thread);
    return true;
  }

  private dropThread(organizerId: string): void {
    const threads = (this.threads() ?? []).filter((t) => t.organizerId !== organizerId);
    this.threads.set(threads);
    this.unread.set(threads.filter((t) => t.adminUnread).length);
  }

  private replaceThread(thread: InboxThread): void {
    const rest = (this.threads() ?? []).filter((t) => t.organizerId !== thread.organizerId);
    const threads = [thread, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
    this.threads.set(threads);
    this.unread.set(threads.filter((t) => t.adminUnread).length);
  }

  private async append(
    organizerId: string,
    organizerName: string,
    from: MessageFrom,
    text: string,
    flags: Pick<InboxThread, 'adminUnread' | 'organizerUnread'>,
  ): Promise<InboxThread | null> {
    const clean = text.trim().slice(0, MAX_CHAT_TEXT);
    if (!clean) return null;
    const ref = this.ref(organizerId);
    const snap = await this.firestore.getDoc(ref);
    const existing = snap.exists() ? (snap.data() as InboxThread) : null;
    const now = Date.now();
    const message: InboxMessage = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      from,
      text: clean,
      at: now,
    };
    const thread: InboxThread = {
      organizerId,
      organizerName: organizerName || existing?.organizerName || '',
      messages: [...(existing?.messages ?? []), message].slice(-MAX_INBOX_MESSAGES),
      ...flags,
      updatedAt: now,
    };
    if (existing) await this.firestore.updateDoc(ref, thread);
    else await this.firestore.setDoc(ref, thread);
    return thread;
  }
}
