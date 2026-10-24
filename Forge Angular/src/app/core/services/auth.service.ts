import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  MIN_ADMIN_PASSWORD,
  SESSION_CHECK_MIN_GAP_MS,
  SESSION_CHECK_MS,
  STORAGE_KEYS,
} from '../config/constants';
import { OrganizerData, Session } from '../models/models';
import { FirestoreService } from './firestore.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

export type PasswordChangeResult = 'ok' | 'wrong' | 'weak' | 'denied';

interface AdminConfig {
  username?: string;
  password?: string;
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firestore = inject(FirestoreService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private lastCheck = 0;
  private lastId = '';
  private lastResult = true;

  readonly session = signal<Session | null>(
    this.storage.getJson<Session | null>(STORAGE_KEYS.session, null),
  );
  readonly loginOpen = signal(false);
  readonly isAdmin = computed(() => this.session()?.role === 'admin');
  readonly canViewOrganizers = computed(
    () => this.isAdmin() || !!this.session()?.canManageOrganizers,
  );

  constructor() {
    const check = () => {
      if (this.session()?.role === 'organizer' && document.visibilityState === 'visible') {
        void this.verifySession();
      }
    };
    const timer = setInterval(check, SESSION_CHECK_MS);
    window.addEventListener('focus', check);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('focus', check);
    });
    check();
  }

  async verifySession(force = false, session = this.session()): Promise<boolean> {
    if (!session) return false;
    if (session.role === 'admin') return true;
    const now = Date.now();
    const fresh = this.lastId === session.id && now - this.lastCheck < SESSION_CHECK_MIN_GAP_MS;
    if (!force && fresh) return this.lastResult;
    try {
      const [organizer, control] = await Promise.all([
        this.firestore.getDoc(doc(this.firestore.db, 'organizers', session.id)),
        this.firestore.getDoc(doc(this.firestore.db, 'config', 'session')),
      ]);
      const signedOutAt = control.exists()
        ? Number(control.data()['organizersLoggedOutAt']) || 0
        : 0;
      const active = organizer.exists() && (session.loginAt ?? 0) >= signedOutAt;
      this.lastCheck = now;
      this.lastId = session.id;
      this.lastResult = active;
      if (!active) {
        if (this.session()?.id === session.id) this.logout();
        this.toast.show(
          organizer.exists()
            ? 'You were signed out by the admin. Please log in again.'
            : 'Your organizer account is no longer active. Contact Speedy on Plato.',
        );
      }
      return active;
    } catch {
      return this.lastResult;
    }
  }

  async logoutAllOrganizers(): Promise<boolean> {
    if (!this.isAdmin()) return false;
    await this.firestore.setDoc(doc(this.firestore.db, 'config', 'session'), {
      organizersLoggedOutAt: Date.now(),
    });
    return true;
  }

  async changeAdminPassword(current: string, next: string): Promise<PasswordChangeResult> {
    if (!this.isAdmin()) return 'denied';
    if (next.length < MIN_ADMIN_PASSWORD) return 'weak';
    const ref = doc(this.firestore.db, 'config', 'admin');
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists() || (snap.data() as AdminConfig).password !== current) return 'wrong';
    await this.firestore.updateDoc(ref, { password: next });
    return 'ok';
  }

  openLogin(): void {
    this.loginOpen.set(true);
  }

  closeLogin(): void {
    this.loginOpen.set(false);
  }

  async login(rawUsername: string, password: string): Promise<Session | null> {
    const username = (rawUsername || '').trim().toLowerCase();
    const session =
      (await this.matchAdmin(username, password)) ??
      (await this.matchOrganizer(username, password));
    if (session) {
      session.loginAt = Date.now();
      this.lastCheck = session.loginAt;
      this.lastId = session.id;
      this.lastResult = true;
      this.storage.setJson(STORAGE_KEYS.session, session);
      this.session.set(session);
    }
    return session;
  }

  logout(): void {
    this.storage.remove(STORAGE_KEYS.session);
    this.session.set(null);
  }

  private async matchAdmin(username: string, password: string): Promise<Session | null> {
    const snap = await this.firestore.getDoc(doc(this.firestore.db, 'config', 'admin'));
    if (!snap.exists()) return null;
    const admin = snap.data() as AdminConfig;
    const matches =
      (admin.username || '').toLowerCase() === username && admin.password === password;
    return matches
      ? { role: 'admin', id: 'admin', displayName: admin.displayName || 'Admin' }
      : null;
  }

  private async matchOrganizer(username: string, password: string): Promise<Session | null> {
    const snap = await this.firestore.getDocs(
      query(collection(this.firestore.db, 'organizers'), where('usernameLower', '==', username)),
    );
    const match = snap.docs.find((d) => (d.data() as OrganizerData).password === password);
    if (!match) return null;
    const data = match.data() as OrganizerData;
    return {
      role: 'organizer',
      id: match.id,
      displayName: data.displayName,
      canManageOrganizers: !!data.canManageOrganizers,
    };
  }
}
