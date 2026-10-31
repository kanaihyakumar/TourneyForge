import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { STORAGE_KEYS } from '../config/constants';
import { ForgeImport, Tournament } from '../models/models';
import { registrationLabel } from '../utils/tournament';
import { StorageService } from './storage.service';
import { TournamentService } from './tournament.service';

@Injectable({ providedIn: 'root' })
export class ForgeImportService {
  private readonly storage = inject(StorageService);
  private readonly tournaments = inject(TournamentService);
  private readonly router = inject(Router);

  read(): ForgeImport | null {
    return this.storage.getJson<ForgeImport | null>(STORAGE_KEYS.forgeImport, null);
  }

  clear(): void {
    this.storage.remove(STORAGE_KEYS.forgeImport);
  }

  select(tournament: Tournament): void {
    this.storage.setJson(STORAGE_KEYS.forgeImport, this.toImport(tournament));
  }

  async launch(id: string): Promise<void> {
    const tournament = await this.tournaments.get(id);
    if (!tournament) return;
    this.select(tournament);
    await this.router.navigateByUrl('/forge');
  }

  private toImport(t: Tournament): ForgeImport {
    return {
      tournamentId: t.id,
      title: t.title,
      game: t.game,
      members: t.registrations.map((r) => registrationLabel(r, t.teamSize)),
    };
  }
}
