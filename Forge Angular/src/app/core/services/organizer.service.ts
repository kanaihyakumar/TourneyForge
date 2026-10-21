import { inject, Injectable } from '@angular/core';
import { collection, doc } from 'firebase/firestore';
import {
  Organizer,
  OrganizerData,
  OrganizerInput,
  OrganizerUpdate,
  Session,
} from '../models/models';
import { FirestoreService } from './firestore.service';
import { TournamentService } from './tournament.service';

@Injectable({ providedIn: 'root' })
export class OrganizerService {
  private readonly firestore = inject(FirestoreService);
  private readonly tournaments = inject(TournamentService);

  private ref(id: string) {
    return doc(this.firestore.db, 'organizers', id);
  }

  async list(): Promise<Organizer[]> {
    const snap = await this.firestore.getDocs(collection(this.firestore.db, 'organizers'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as OrganizerData) }));
  }

  async create(input: OrganizerInput, creator: Session | null): Promise<Organizer> {
    const payload: OrganizerData = {
      username: input.username.trim(),
      usernameLower: input.username.trim().toLowerCase(),
      password: input.password,
      displayName: input.displayName.trim(),
      canManageOrganizers: !!input.canManageOrganizers,
      maxTournaments: Math.max(0, Math.floor(Number(input.maxTournaments) || 0)),
      createdBy: creator?.id ?? 'admin',
      createdAt: Date.now(),
    };
    const ref = await this.firestore.addDoc(collection(this.firestore.db, 'organizers'), payload);
    return { id: ref.id, ...payload };
  }

  async update(id: string, input: OrganizerUpdate): Promise<Organizer | null> {
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return null;
    const updates: Partial<OrganizerData> = {};
    if (input.username) {
      updates.username = input.username.trim();
      updates.usernameLower = input.username.trim().toLowerCase();
    }
    if (input.displayName) updates.displayName = input.displayName.trim();
    if (input.canManageOrganizers !== undefined)
      updates.canManageOrganizers = !!input.canManageOrganizers;
    if (input.maxTournaments !== undefined) {
      updates.maxTournaments = Math.max(0, Math.floor(Number(input.maxTournaments) || 0));
    }
    await this.firestore.updateDoc(ref, updates);
    if (updates.displayName) {
      await this.tournaments.patchByOrganizer(id, { organizerName: updates.displayName });
    }
    return { id, ...(snap.data() as OrganizerData), ...updates };
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.firestore.updateDoc(this.ref(id), { password });
  }

  async remove(id: string): Promise<void> {
    await this.firestore.deleteDoc(this.ref(id));
    await this.tournaments.patchByOrganizer(id, { organizerId: 'admin' });
  }
}
