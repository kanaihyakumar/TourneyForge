import { inject, Injectable, signal } from '@angular/core';
import { collection, doc, query, where } from 'firebase/firestore';
import { DEFAULT_TIMEZONE, LOCK_EXEMPT_FIELDS, STORAGE_KEYS } from '../config/constants';
import { formatWithZone } from '../utils/time';
import {
  BulkAddResult,
  ClearOptions,
  ForgeState,
  Registration,
  RegistrationResult,
  Session,
  Tournament,
  TournamentData,
  TournamentInput,
  TournamentUpdate,
} from '../models/models';
import { deleteField } from 'firebase/firestore';
import { replaceInForgeState } from '../utils/bracket';
import { formatPlatoId, normalizePlatoId, ParsedParticipant, teamLabel } from '../utils/plato';
import {
  canManage,
  capacityFor,
  cleanList,
  cleanWinners,
  findDuplicateRegistration,
  registrationLabel,
  sortTournaments,
  withMeta,
} from '../utils/tournament';
import { FirestoreService } from './firestore.service';
import { StorageService } from './storage.service';

const UPDATABLE_FIELDS = [
  'title',
  'gameMode',
  'format',
  'gameSettings',
  'mixed',
  'scoring',
  'groupName',
  'game',
  'announcement',
  'details',
  'prizeText',
  'sponsor',
  'closingMessage',
  'startUTC',
  'createdTZ',
  'registrationOpensAt',
  'cancelled',
  'completed',
  'locked',
] as const;

export class TournamentLimitError extends Error {}

export interface TournamentQuota {
  limit: number;
  used: number;
  reached: boolean;
}

const normalizeTeamSize = (value: unknown): 1 | 2 => (parseInt(String(value), 10) === 2 ? 2 : 1);
const normalizePlayersPerMatch = (value: unknown): number =>
  Math.max(2, parseInt(String(value), 10) || 2);
const normalizeSlots = (value: unknown): number => parseInt(String(value), 10) || 0;

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly firestore = inject(FirestoreService);
  private readonly storage = inject(StorageService);

  readonly myRegistrations = signal<string[]>(
    this.storage.getJson<string[]>(STORAGE_KEYS.myRegistrations, []),
  );

  private async ownedOrganizerIds(session: Session | null): Promise<Set<string>> {
    if (!session) return new Set();
    const snap = await this.firestore.getDocs(
      query(collection(this.firestore.db, 'organizers'), where('createdBy', '==', session.id)),
    );
    return new Set(snap.docs.map((d) => d.id));
  }

  private async grantableManagers(session: Session | null, ids: string[]): Promise<string[]> {
    if (session?.role === 'admin') return ids;
    if (!session || !ids.length) return [];
    const owned = await this.ownedOrganizerIds(session);
    return ids.filter((id) => owned.has(id));
  }

  private ref(id: string) {
    return doc(this.firestore.db, 'tournaments', id);
  }

  async list(): Promise<Tournament[]> {
    const snap = await this.firestore.getDocs(collection(this.firestore.db, 'tournaments'));
    return sortTournaments(snap.docs.map((d) => withMeta(d.id, d.data() as TournamentData)));
  }

  async get(id: string): Promise<Tournament | null> {
    const snap = await this.firestore.getDoc(this.ref(id));
    return snap.exists() ? withMeta(snap.id, snap.data() as TournamentData) : null;
  }

  async quota(session: Session | null): Promise<TournamentQuota> {
    if (!session || session.role !== 'organizer') return { limit: 0, used: 0, reached: false };
    const [organizer, owned] = await Promise.all([
      this.firestore.getDoc(doc(this.firestore.db, 'organizers', session.id)),
      this.firestore.getDocs(
        query(collection(this.firestore.db, 'tournaments'), where('organizerId', '==', session.id)),
      ),
    ]);
    const limit = Number(organizer.exists() ? organizer.data()['maxTournaments'] : 0) || 0;
    const used = owned.docs.length;
    return { limit, used, reached: limit > 0 && used >= limit };
  }

  async create(input: TournamentInput, session: Session | null): Promise<Tournament | null> {
    if (!session) return null;
    if ((await this.quota(session)).reached) {
      throw new TournamentLimitError('Tournament limit reached.');
    }
    const now = Date.now();
    const payload: TournamentData = {
      title: input.title.trim(),
      groupName: (input.groupName || '').trim(),
      game: input.game.trim(),
      slots: normalizeSlots(input.slots),
      announcement: input.announcement || '',
      details: input.details || '',
      prizeText: input.prizeText || '',
      hosts: cleanList(input.hosts),
      sponsor: (input.sponsor || '').trim(),
      closingMessage: (input.closingMessage || '').trim(),
      winners: cleanWinners(input.winners),
      teamSize: normalizeTeamSize(input.teamSize),
      gameMode: input.gameMode ?? '',
      format: input.format ?? (normalizeTeamSize(input.teamSize) === 2 ? '2v2' : '1v1'),
      playersPerMatch: normalizePlayersPerMatch(input.playersPerMatch),
      gameSettings: input.gameSettings ?? {},
      mixed: input.mixed ?? [],
      ...(input.scoring ? { scoring: input.scoring } : {}),
      startUTC: input.startUTC,
      createdTZ: input.createdTZ,
      registrationOpensAt: Math.max(0, Number(input.registrationOpensAt) || 0),
      organizerId: session.id,
      organizerName: session.displayName,
      managerIds: await this.grantableManagers(session, cleanList(input.managerIds)),
      registrations: [],
      cancelled: false,
      completed: false,
      locked: true,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await this.firestore.addDoc(collection(this.firestore.db, 'tournaments'), payload);
    return withMeta(ref.id, payload);
  }

  async update(
    id: string,
    input: TournamentUpdate,
    session: Session | null,
  ): Promise<Tournament | null> {
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return null;
    const existing = snap.data() as TournamentData;
    if (!canManage(session, existing)) return null;
    if (session?.role !== 'admin') {
      const touched = Object.keys(input).filter(
        (key) => (input as Record<string, unknown>)[key] !== undefined,
      );
      if (
        input.locked === false ||
        (existing.locked !== false && touched.some((key) => !LOCK_EXEMPT_FIELDS.includes(key)))
      ) {
        return null;
      }
    }

    const updates: Partial<TournamentData> = {};
    const writable = updates as Record<string, unknown>;
    UPDATABLE_FIELDS.forEach((key) => {
      if (input[key] !== undefined) writable[key] = input[key];
    });
    if (input.hosts !== undefined) updates.hosts = cleanList(input.hosts);
    if (input.winners !== undefined) updates.winners = cleanWinners(input.winners);
    if (input.teamSize !== undefined) updates.teamSize = normalizeTeamSize(input.teamSize);
    if (input.slots !== undefined) updates.slots = normalizeSlots(input.slots);
    if (input.playersPerMatch !== undefined) {
      updates.playersPerMatch = normalizePlayersPerMatch(input.playersPerMatch);
    }
    if (input.managerIds !== undefined) {
      const requested = cleanList(input.managerIds);
      if (session?.role === 'admin') {
        updates.managerIds = requested;
      } else {
        const owned = await this.ownedOrganizerIds(session);
        updates.managerIds = [
          ...(existing.managerIds || []).filter((id) => !owned.has(id)),
          ...requested.filter((id) => owned.has(id)),
        ];
      }
    }
    updates.updatedAt = Date.now();

    await this.firestore.updateDoc(ref, updates);
    return withMeta(id, { ...existing, ...updates });
  }

  async remove(id: string, session: Session | null): Promise<boolean> {
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() as TournamentData;
    if (!canManage(session, data)) return false;
    if (session?.role !== 'admin' && data.locked !== false) return false;
    await this.firestore.deleteDoc(ref);
    return true;
  }

  async patchByOrganizer(organizerId: string, patch: Partial<TournamentData>): Promise<void> {
    const snap = await this.firestore.getDocs(
      query(collection(this.firestore.db, 'tournaments'), where('organizerId', '==', organizerId)),
    );
    await Promise.all(snap.docs.map((d) => this.firestore.updateDoc(this.ref(d.id), patch)));
  }

  async getForgeState(id: string): Promise<ForgeState | null> {
    const snap = await this.firestore.getDoc(this.ref(id));
    return snap.exists() ? ((snap.data() as TournamentData).forgeState ?? null) : null;
  }

  async saveForgeState(id: string, state: ForgeState, session: Session | null): Promise<boolean> {
    if (!id) return false;
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists() || !canManage(session, snap.data() as TournamentData)) return false;
    await this.firestore.updateDoc(ref, {
      forgeState: JSON.parse(JSON.stringify(state)),
      forgeStateUpdatedAt: Date.now(),
    });
    return true;
  }

  async register(
    id: string,
    platoId: string,
    partnerPlatoId?: string,
    staff: Session | null = null,
  ): Promise<RegistrationResult> {
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return { ok: false, message: 'Tournament not found.' };
    const data = snap.data() as TournamentData;
    if (staff && !canManage(staff, data)) {
      return { ok: false, message: 'You do not have permission to edit this tournament.' };
    }
    if (!staff && Number(data.registrationOpensAt) > Date.now()) {
      return {
        ok: false,
        message: `Registration hasn't opened yet. It opens ${formatWithZone(
          Number(data.registrationOpensAt),
          data.createdTZ || DEFAULT_TIMEZONE,
        )}.`,
      };
    }
    const who = staff ? 'the' : 'your';
    const registrations = data.registrations || [];
    const isTeam = data.teamSize === 2;
    const capacity = capacityFor(data.slots, data.teamSize ?? 1);

    if (capacity && registrations.length >= capacity) {
      return {
        ok: false,
        message: isTeam
          ? `All team slots are full for this tournament.${staff ? ' Increase the slots first.' : ''}`
          : `All slots are full for this tournament.${staff ? ' Increase the slots first.' : ''}`,
      };
    }
    const clean = (platoId || '').trim();
    if (!clean) return { ok: false, message: 'Please enter your Plato ID.' };
    const cleanCmp = normalizePlatoId(clean);

    let cleanPartner = '';
    let partnerCmp = '';
    if (isTeam) {
      cleanPartner = (partnerPlatoId || '').trim();
      if (!cleanPartner) {
        return {
          ok: false,
          message: `This is a 2v2 tournament - please enter ${who} partner's Plato ID too.`,
        };
      }
      partnerCmp = normalizePlatoId(cleanPartner);
      if (!partnerCmp || partnerCmp === cleanCmp) {
        return {
          ok: false,
          message: `${staff ? 'A' : 'Your'} Plato ID and ${who} partner's Plato ID can't be the same.`,
        };
      }
    }

    const duplicate = findDuplicateRegistration(registrations, clean, cleanPartner);
    if (duplicate) {
      return { ok: false, message: `That Plato ID (or ${who} partner's) is already registered.` };
    }

    const entry: Registration = { platoId: clean, registeredAt: Date.now() };
    if (cleanPartner) entry.partnerPlatoId = cleanPartner;
    await this.firestore.updateDoc(ref, { registrations: [...registrations, entry] });
    if (staff) return { ok: true, message: 'Participant added.' };
    this.rememberRegistration(id);
    return { ok: true, message: "You're in! Good luck in the arena." };
  }

  addParticipant(
    id: string,
    platoId: string,
    partnerPlatoId: string,
    session: Session | null,
  ): Promise<RegistrationResult> {
    if (!session) return Promise.resolve({ ok: false, message: 'Please sign in first.' });
    return this.register(id, platoId, partnerPlatoId, session);
  }

  async addParticipants(
    id: string,
    entries: ParsedParticipant[],
    session: Session | null,
  ): Promise<BulkAddResult> {
    const failed = (message: string): BulkAddResult => ({
      ok: false,
      message,
      added: 0,
      skipped: [],
    });
    if (!session) return failed('Please sign in first.');
    if (session.role !== 'admin')
      return failed('Only an admin can add several participants at once.');
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return failed('Tournament not found.');
    const data = snap.data() as TournamentData;
    if (!canManage(session, data))
      return failed('You do not have permission to edit this tournament.');

    const isTeam = data.teamSize === 2;
    const capacity = capacityFor(data.slots, data.teamSize ?? 1);
    const registrations = [...(data.registrations || [])];
    const skipped: BulkAddResult['skipped'] = [];
    let added = 0;

    for (const raw of entries) {
      const platoId = raw.platoId.trim();
      const partner = isTeam ? raw.partnerPlatoId.trim() : '';
      const label = teamLabel(platoId, partner);
      const reason = !platoId
        ? 'Missing Plato ID.'
        : isTeam && !partner
          ? 'Missing partner Plato ID.'
          : isTeam && normalizePlatoId(platoId) === normalizePlatoId(partner)
            ? 'Player and partner are the same.'
            : capacity && registrations.length >= capacity
              ? 'No slots left.'
              : findDuplicateRegistration(registrations, platoId, partner)
                ? 'Already registered.'
                : '';
      if (reason) {
        skipped.push({ label: label || '(empty)', reason });
        continue;
      }
      const entry: Registration = { platoId, registeredAt: Date.now() };
      if (partner) entry.partnerPlatoId = partner;
      registrations.push(entry);
      added++;
    }

    if (added) await this.firestore.updateDoc(ref, { registrations, updatedAt: Date.now() });
    return {
      ok: added > 0,
      message: added
        ? `Added ${added} participant${added === 1 ? '' : 's'}.`
        : 'No participants were added.',
      added,
      skipped,
    };
  }

  async replaceParticipant(
    id: string,
    index: number,
    platoId: string,
    partnerPlatoId: string,
    session: Session | null,
  ): Promise<RegistrationResult> {
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists()) return { ok: false, message: 'Tournament not found.' };
    const data = snap.data() as TournamentData;
    if (!canManage(session, data))
      return { ok: false, message: 'You do not have permission to edit this tournament.' };
    const registrations = data.registrations || [];
    const current = registrations[index];
    if (!current) return { ok: false, message: 'That participant no longer exists.' };

    const isTeam = data.teamSize === 2;
    const clean = (platoId || '').trim();
    const cleanPartner = isTeam ? (partnerPlatoId || '').trim() : '';
    if (!clean) return { ok: false, message: 'Please enter a Plato ID.' };
    if (isTeam) {
      if (!cleanPartner) return { ok: false, message: "Please enter the partner's Plato ID too." };
      if (normalizePlatoId(clean) === normalizePlatoId(cleanPartner)) {
        return { ok: false, message: "A player and their partner can't have the same Plato ID." };
      }
    }
    if (findDuplicateRegistration(registrations, clean, cleanPartner, index)) {
      return { ok: false, message: 'That Plato ID is already registered in another entry.' };
    }

    const entry: Registration = { ...current, platoId: clean };
    if (cleanPartner) entry.partnerPlatoId = cleanPartner;
    else delete entry.partnerPlatoId;

    const teamSize = data.teamSize ?? 1;
    const oldLabel = registrationLabel(current, teamSize);
    const newLabel = registrationLabel(entry, teamSize);
    const updated = registrations.map((r, i) => (i === index ? entry : r));
    const patch: Record<string, unknown> = { registrations: updated, updatedAt: Date.now() };

    const sameAsOld = (name: string) => normalizePlatoId(name) === normalizePlatoId(oldLabel);
    if ((data.winners || []).some((w) => sameAsOld(w.name))) {
      patch['winners'] = data.winners!.map((w) =>
        sameAsOld(w.name) ? { ...w, name: formatPlatoId(newLabel) } : w,
      );
    }
    if (data.forgeState) {
      patch['forgeState'] = JSON.parse(
        JSON.stringify(replaceInForgeState(data.forgeState, oldLabel, newLabel)),
      );
      patch['forgeStateUpdatedAt'] = Date.now();
    }
    await this.firestore.updateDoc(ref, patch);
    return { ok: true, message: 'Participant replaced everywhere.' };
  }

  async clearData(id: string, options: ClearOptions, session: Session | null): Promise<boolean> {
    if (session?.role !== 'admin') return false;
    const ref = this.ref(id);
    const snap = await this.firestore.getDoc(ref);
    if (!snap.exists() || !canManage(session, snap.data() as TournamentData)) return false;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (options.registrations) patch['registrations'] = [];
    if (options.forgeState) {
      patch['forgeState'] = deleteField();
      patch['forgeStateUpdatedAt'] = deleteField();
    }
    if (options.winners) patch['winners'] = [];
    if (options.closingMessage) patch['closingMessage'] = '';
    if (options.details) patch['details'] = '';
    await this.firestore.updateDoc(ref, patch);
    return true;
  }

  async clearMany(ids: string[], options: ClearOptions, session: Session | null): Promise<number> {
    const results = await Promise.all(ids.map((id) => this.clearData(id, options, session)));
    return results.filter(Boolean).length;
  }

  async removeMany(ids: string[], session: Session | null): Promise<number> {
    if (session?.role !== 'admin') return 0;
    const results = await Promise.all(ids.map((id) => this.remove(id, session)));
    return results.filter(Boolean).length;
  }

  private rememberRegistration(id: string): void {
    if (this.myRegistrations().includes(id)) return;
    const next = [...this.myRegistrations(), id];
    this.myRegistrations.set(next);
    this.storage.setJson(STORAGE_KEYS.myRegistrations, next);
  }
}
