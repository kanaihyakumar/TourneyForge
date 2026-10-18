import { computed, inject, Injectable, signal } from '@angular/core';
import { collection, doc, query, where } from 'firebase/firestore';
import { STORAGE_KEYS } from '../config/constants';
import { OrganizerData, Session } from '../models/models';
import { FirestoreService } from './firestore.service';
import { StorageService } from './storage.service';

interface AdminConfig {
  username?: string;
  password?: string;
  displayName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firestore = inject(FirestoreService);
  private readonly storage = inject(StorageService);

  readonly session = signal<Session | null>(
    this.storage.getJson<Session | null>(STORAGE_KEYS.session, null),
  );
  readonly loginOpen = signal(false);
  readonly isAdmin = computed(() => this.session()?.role === 'admin');
  readonly canViewOrganizers = computed(
    () => this.isAdmin() || !!this.session()?.canManageOrganizers,
  );

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
