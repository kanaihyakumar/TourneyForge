import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { collection, doc, getDoc, runTransaction } from 'firebase/firestore';
import {
  FREE_QUOTA,
  USAGE_FLUSH_MS,
  USAGE_HISTORY_DAYS,
  USAGE_TIMEZONE,
  USAGE_WARN_RATIO,
} from '../config/constants';
import {
  CollectionUsage,
  StorageEstimate,
  TournamentData,
  TournamentUsage,
  UsageDay,
  UsageDoc,
} from '../models/models';
import { estimateDocBytes } from '../utils/size';
import { FirestoreService } from './firestore.service';

const EMPTY_DAY: UsageDay = { reads: 0, writes: 0, deletes: 0 };
const TRACKED_COLLECTIONS = ['tournaments', 'organizers', 'config'];

export type QuotaLevel = 'ok' | 'warn' | 'full';

export function dayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: USAGE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function quotaLevel(used: number, limit: number): QuotaLevel {
  if (used >= limit) return 'full';
  return used >= limit * USAGE_WARN_RATIO ? 'warn' : 'ok';
}

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly firestore = inject(FirestoreService);

  readonly days = signal<Record<string, UsageDay>>({});
  readonly loaded = signal(false);
  readonly error = signal(false);

  private readonly usageRef = doc(this.firestore.db, 'config', 'usage');

  constructor() {
    const timer = setInterval(() => void this.flush(), USAGE_FLUSH_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void this.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
    });
  }

  today(): UsageDay {
    const stored = this.days()[dayKey()] ?? EMPTY_DAY;
    const pending = this.firestore.peekPending();
    return {
      reads: stored.reads + pending.reads,
      writes: stored.writes + pending.writes,
      deletes: stored.deletes + pending.deletes,
    };
  }

  worstLevel(): QuotaLevel {
    const today = this.today();
    const levels = [
      quotaLevel(today.reads, FREE_QUOTA.reads),
      quotaLevel(today.writes, FREE_QUOTA.writes),
      quotaLevel(today.deletes, FREE_QUOTA.deletes),
    ];
    return levels.includes('full') ? 'full' : levels.includes('warn') ? 'warn' : 'ok';
  }

  async load(): Promise<void> {
    this.error.set(false);
    try {
      const snap = await getDoc(this.usageRef);
      this.days.set(snap.exists() ? ((snap.data() as UsageDoc).days ?? {}) : {});
      this.firestore.addPending({ reads: 1, writes: 0, deletes: 0 });
      this.loaded.set(true);
    } catch (err) {
      this.error.set(true);
      console.error(err);
    }
  }

  async flush(): Promise<void> {
    const pending = this.firestore.takePending();
    if (!pending.reads && !pending.writes && !pending.deletes) return;
    const today = dayKey();
    try {
      const days = await runTransaction(this.firestore.db, async (tx) => {
        const snap = await tx.get(this.usageRef);
        const existing = snap.exists() ? ((snap.data() as UsageDoc).days ?? {}) : {};
        const kept = Object.keys(existing)
          .sort()
          .slice(-(USAGE_HISTORY_DAYS - 1))
          .reduce<Record<string, UsageDay>>((acc, key) => ({ ...acc, [key]: existing[key] }), {});
        const current = kept[today] ?? EMPTY_DAY;
        kept[today] = {
          reads: current.reads + pending.reads + 1,
          writes: current.writes + pending.writes + 1,
          deletes: current.deletes + pending.deletes,
        };
        tx.set(this.usageRef, { days: kept });
        return kept;
      });
      this.days.set(days);
    } catch (err) {
      this.firestore.addPending(pending);
      console.error(err);
    }
  }

  async estimateStorage(): Promise<StorageEstimate> {
    const collections: CollectionUsage[] = [];
    const tournaments: TournamentUsage[] = [];
    let totalBytes = 0;
    for (const name of TRACKED_COLLECTIONS) {
      const snap = await this.firestore.getDocs(collection(this.firestore.db, name));
      let bytes = 0;
      snap.docs.forEach((d) => {
        const size = estimateDocBytes(name, d.id, d.data());
        bytes += size;
        if (name === 'tournaments') {
          const data = d.data() as TournamentData;
          tournaments.push({
            id: d.id,
            title: data.title,
            bytes: size,
            registrations: (data.registrations ?? []).length,
            hasBracket: !!data.forgeState,
          });
        }
      });
      collections.push({ name, count: snap.size, bytes });
      totalBytes += bytes;
    }
    tournaments.sort((a, b) => b.bytes - a.bytes);
    return { totalBytes, collections, tournaments };
  }
}
