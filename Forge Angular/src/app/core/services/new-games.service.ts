import { computed, inject, Injectable, signal } from '@angular/core';
import { activeNewGames } from '../config/new-games';
import { StorageService } from './storage.service';

const SEEN_KEY = 'tf_seen_new_games_v1';

@Injectable({ providedIn: 'root' })
export class NewGamesService {
  private readonly storage = inject(StorageService);
  private readonly seen = signal<string[]>(this.storage.getJson<string[]>(SEEN_KEY, []));

  readonly unseen = computed(() => activeNewGames().filter((g) => !this.seen().includes(g.name)));

  dismiss(): void {
    const next = [...new Set([...this.seen(), ...this.unseen().map((g) => g.name)])];
    this.seen.set(next);
    this.storage.setJson(SEEN_KEY, next);
  }
}
