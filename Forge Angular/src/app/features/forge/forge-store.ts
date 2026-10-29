import { computed, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_FORGE_MEMBERS } from '../../core/config/constants';
import {
  BracketStage,
  PlayerCategory,
  ScoreGame,
  Tournament,
  WerewolfSide,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import {
  buildForgeState,
  clampAdvance,
  deserializeStages,
  groupUp,
  hasPickedWinners,
  fullTableTotals,
  isStageComplete,
  newStage,
  roundWinnerLines,
  nextStageLabel,
  podiumFromStages,
  stageLosers,
  stageNames,
  stageWinners,
  tableSizes,
  toggleWinner,
} from '../../core/utils/bracket';
import { entryPerMatch, findGame, roundSizeOptions } from '../../core/config/games';
import { normalizePlatoId } from '../../core/utils/plato';
import { computeLeaderboard, scoringGames, standingDetail } from '../../core/utils/scoring';
import {
  canManage,
  isViewOnlyFor,
  registrationLabel,
  usesFreeRounds,
  winnersFromPodium,
  withPrizes,
} from '../../core/utils/tournament';

const REFRESH_MIN_GAP_MS = 20_000;

@Injectable()
export class ForgeStore {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly forgeImport = inject(ForgeImportService);

  readonly imported = this.forgeImport.read();
  readonly tournamentId = this.imported?.tournamentId ?? null;

  readonly members = signal<string[]>(
    this.imported?.members?.length ? [...this.imported.members] : [...DEFAULT_FORGE_MEMBERS],
  );
  readonly tournament = signal<Tournament | null>(null);
  readonly stages = signal<BracketStage[]>([]);
  readonly thirdPlaceEnabled = signal(true);
  readonly perMatch = signal(2);
  readonly advancePerMatch = signal(1);
  readonly games = signal<ScoreGame[]>([]);
  readonly syncStatus = signal('');
  readonly nextPlayers = signal<string[] | null>(null);
  readonly nextPerMatch = signal<number | null>(null);

  readonly tournamentMode = this.tournamentId !== null;
  readonly mixedGames = computed(() => this.tournament()?.mixed ?? []);
  readonly isMixed = computed(() => this.mixedGames().length > 1);
  readonly freeRounds = computed(() => {
    const t = this.tournament();
    return !!t && usesFreeRounds(t);
  });
  readonly nextGame = signal<string | null>(null);
  readonly defaultNextGame = computed(() => {
    const mixed = this.mixedGames();
    if (!mixed.length) return null;
    const last = this.lastStage()?.game;
    const index = mixed.findIndex((m) => m.game === last);
    return mixed[Math.min(index + 1, mixed.length - 1)].game;
  });
  readonly plannedGame = computed(() => this.nextGame() ?? this.defaultNextGame());
  readonly plannedEntry = computed(
    () => this.mixedGames().find((m) => m.game === this.plannedGame()) ?? null,
  );
  readonly roundSizeOptions = computed(() =>
    roundSizeOptions(
      findGame(this.isMixed() ? (this.plannedGame() ?? '') : (this.tournament()?.game ?? '')),
      this.plannedSize(),
    ),
  );
  readonly plannedPlayers = computed(
    () => this.nextPlayers() ?? (this.lastStage() ? stageNames(this.lastStage()!) : []),
  );
  readonly plannedSize = computed(
    () =>
      this.nextPerMatch() ??
      (this.isMixed() ? entryPerMatch(this.plannedEntry()) : null) ??
      this.lastStage()?.perMatch ??
      this.perMatch(),
  );
  readonly roundWinnerLines = computed(() => roundWinnerLines(this.stages()));
  readonly viewOnly = computed(() => isViewOnlyFor(this.auth.session(), this.tournament()));
  readonly canReplace = computed(
    () => canManage(this.auth.session(), this.tournament()) && !this.viewOnly(),
  );
  readonly scoring = computed(() => {
    const config = this.tournament()?.scoring;
    return config?.enabled ? config : null;
  });
  readonly leaderboard = computed(() => {
    const config = this.scoring();
    return config
      ? computeLeaderboard(this.members(), scoringGames(this.games(), this.stages()), config)
      : [];
  });
  readonly tableSizeOptions = computed(() => {
    const tournament = this.tournament();
    if (!tournament || tournament.teamSize === 2 || this.isMixed() || this.freeRounds()) return [];
    const options = roundSizeOptions(findGame(tournament.game), this.perMatch());
    return options.length > 1 ? options : [];
  });
  readonly nextRound = computed(() => {
    const stage = this.lastStage();
    if (
      !stage ||
      this.freeRounds() ||
      !this.lastStageComplete() ||
      this.podium() ||
      this.perMatch() <= 2
    ) {
      return null;
    }
    const count = stageWinners(stage).length;
    if (count < 2) return null;
    return {
      count,
      sizes: tableSizes(count, this.perMatch()),
      fullTotals: fullTableTotals(count, this.perMatch()),
    };
  });
  readonly started = computed(() => this.stages().length > 0);
  readonly podium = computed(() => (this.freeRounds() ? null : podiumFromStages(this.stages())));
  readonly winnerPlaces = signal(3);
  readonly pointsStandings = computed(() =>
    this.leaderboard()
      .filter((r) => r.games > 0 || r.pro > 0 || r.nab > 0)
      .slice(0, this.winnerPlaces()),
  );
  private readonly rankedWinners = computed(() => {
    if (this.scoring() && this.pointsStandings().length) {
      return this.pointsStandings().map((r, i) => ({
        place: i + 1,
        name: r.name,
        detail: standingDetail(r),
      }));
    }
    const podium = this.podium();
    return podium ? winnersFromPodium(podium) : [];
  });
  readonly winners = computed(() => {
    const tournament = this.tournament();
    return tournament ? withPrizes(this.rankedWinners(), tournament) : this.rankedWinners();
  });
  readonly lastStage = computed(() => this.stages().at(-1) ?? null);
  readonly lastStageComplete = computed(() => {
    const stage = this.lastStage();
    return !!stage && isStageComplete(stage);
  });
  readonly advanceLabel = computed(() => {
    const stage = this.lastStage();
    if (!stage || this.freeRounds() || !this.lastStageComplete() || this.podium()) return null;
    const winnerCount = stageWinners(stage).length;
    return winnerCount > 1 ? nextStageLabel(winnerCount, this.perMatch()) : null;
  });

  private saveSeq = 0;
  private pendingSaves = 0;
  private saveChain: Promise<void> = Promise.resolve();
  private forgeStamp = 0;
  private knownUpdatedAt = 0;
  private epoch = 0;
  private resolving = false;
  private loadedOnce = false;
  private lastCheck = 0;

  get hasPendingSaves(): boolean {
    return this.pendingSaves > 0;
  }

  init(): void {
    if (!this.tournamentId) return;
    this.syncStatus.set('☁️ Loading saved bracket…');
    this.load().catch((err) => {
      this.syncStatus.set('⚠️ Could not load saved bracket - check connection.');
      console.error(err);
    });
  }

  async refresh(): Promise<void> {
    if (this.tournamentId) await this.load();
  }

  async refreshIfChanged(minGapMs = REFRESH_MIN_GAP_MS): Promise<void> {
    if (!this.tournamentId || this.pendingSaves > 0 || this.resolving) return;
    const now = Date.now();
    if (now - this.lastCheck < minGapMs) return;
    this.lastCheck = now;
    const latest = await this.tournaments.get(this.tournamentId);
    if (!latest || this.pendingSaves > 0 || this.resolving) return;
    const changed =
      latest.updatedAt !== this.knownUpdatedAt ||
      (latest.forgeStateUpdatedAt ?? 0) > this.forgeStamp;
    if (changed) await this.load(latest);
  }

  private async load(prefetched?: Tournament | null): Promise<void> {
    const tournament =
      prefetched ?? (this.tournamentId ? await this.tournaments.get(this.tournamentId) : null);
    if (!tournament) {
      this.syncStatus.set('⚠️ Tournament not found.');
      return;
    }
    const previous = this.members();
    const bracket = tournament.forgeState?.bracket;
    const keepSettings = this.loadedOnce && !bracket?.stages?.length && !this.started();
    this.tournament.set(tournament);
    this.knownUpdatedAt = tournament.updatedAt;
    this.forgeStamp = tournament.forgeStateUpdatedAt ?? 0;
    if (!keepSettings) {
      this.perMatch.set(
        bracket?.stages?.length
          ? (bracket.perMatch ?? tournament.playersPerMatch)
          : tournament.playersPerMatch,
      );
      this.thirdPlaceEnabled.set(bracket ? !!bracket.thirdPlaceEnabled : true);
      this.advancePerMatch.set(bracket?.advance ?? 1);
    }
    const members = tournament.registrations.map((r) => registrationLabel(r, tournament.teamSize));
    this.members.set(members);
    this.carryOverNextPlayers(previous, members);
    this.games.set(tournament.forgeState?.games ?? []);
    this.stages.set(bracket?.stages?.length ? deserializeStages(bracket.stages) : []);
    this.loadedOnce = true;
    this.syncStatus.set(
      bracket?.stages?.length
        ? '☁️ Loaded saved bracket from this tournament'
        : '☁️ Auto-saving to this tournament',
    );
  }

  private carryOverNextPlayers(previous: string[], members: string[]): void {
    const renamed = new Map<string, string>();
    previous.forEach((name, i) => {
      if (members[i] !== undefined && members[i] !== name) renamed.set(name, members[i]);
    });
    this.nextPlayers.update((list) =>
      list ? list.map((n) => renamed.get(n) ?? n).filter((n) => members.includes(n)) : list,
    );
  }

  exitTournamentMode(): void {
    this.forgeImport.clear();
    location.reload();
  }

  addMember(name: string): void {
    if (this.tournamentMode) return;
    this.members.update((list) => [...list, name]);
    this.persist();
  }

  removeMember(index: number): void {
    if (this.tournamentMode) return;
    this.members.update((list) => list.filter((_, i) => i !== index));
    this.persist();
  }

  setPerMatch(size: number): void {
    this.perMatch.set(size);
    this.advancePerMatch.set(clampAdvance(this.advancePerMatch(), size));
  }

  startBracket(): void {
    if (this.viewOnly()) return;
    const names = this.members();
    if (names.length < 2) {
      this.toast.show('Add at least 2 participants before starting a bracket.', 'accent');
      return;
    }
    this.advancePerMatch.set(clampAdvance(this.advancePerMatch(), this.perMatch()));
    this.games.set([]);
    this.nextPlayers.set(null);
    this.nextPerMatch.set(null);
    this.nextGame.set(null);
    this.stages.set([
      newStage(
        names,
        this.perMatch(),
        this.advancePerMatch(),
        this.freeRounds() ? 1 : 0,
        this.isMixed() ? this.mixedGames()[0].game : '',
      ),
    ]);
    this.persist();
    this.toast.show('Bracket created! Your first match set is saved.', 'accent');
  }

  resetBracket(): void {
    if (this.viewOnly()) return;
    const message = this.scoring()
      ? 'Reset the whole bracket? This clears all picked winners and the recorded points and leaderboard (Pro / Nab tags are kept).'
      : 'Reset the whole bracket? This clears all picked winners.';
    if (!confirm(message)) return;
    this.stages.set([]);
    this.nextPlayers.set(null);
    this.nextPerMatch.set(null);
    this.nextGame.set(null);
    this.games.set([]);
    this.thirdPlaceEnabled.set(true);
    this.persist();
  }

  reshuffleLastStage(): void {
    if (this.viewOnly()) return;
    const stage = this.lastStage();
    if (!stage) return;
    if (
      hasPickedWinners(stage) &&
      !confirm('Reshuffling will clear any winners already picked in this match set. Continue?')
    ) {
      return;
    }
    this.replaceLastStage({
      ...stage,
      matches: groupUp(stageNames(stage), stage.perMatch ?? this.perMatch()),
    });
    this.persist();
    this.toast.show('Match set reshuffled!', 'accent');
  }

  pickWinner(stageIndex: number, matchIndex: number, playerIndex: number): void {
    if (this.viewOnly()) return;
    this.stages.update((stages) =>
      stages.map((stage, si) =>
        si !== stageIndex
          ? stage
          : {
              ...stage,
              matches: stage.matches.map((m, mi) =>
                mi === matchIndex ? toggleWinner(m, playerIndex, stage) : m,
              ),
            },
      ),
    );
    this.persist();
  }

  advance(): void {
    if (this.viewOnly()) return;
    const last = this.lastStage();
    if (!last || !isStageComplete(last)) return;
    const winners = stageWinners(last);
    const next: BracketStage[] = [];

    const needsThirdPlace =
      this.perMatch() === 2 &&
      winners.length === 2 &&
      this.thirdPlaceEnabled() &&
      !this.stages().some((s) => s.isThirdPlace);
    if (needsThirdPlace) {
      const losers = stageLosers(last);
      if (losers.length === 2) {
        next.push({
          label: '3rd Place Match',
          isThirdPlace: true,
          advance: 1,
          matches: groupUp(losers, 2),
        });
      }
    }
    next.push(newStage(winners, this.perMatch(), this.advancePerMatch()));

    this.stages.update((stages) => [...stages, ...next]);
    this.persist();
  }

  gameFor(ref: string): ScoreGame | undefined {
    return this.games().find((g) => g.ref === ref);
  }

  private upsertGame(
    ref: string,
    label: string,
    players: string[],
    change: (game: ScoreGame) => ScoreGame,
  ): void {
    if (this.viewOnly()) return;
    const existing = this.gameFor(ref);
    if (existing) {
      this.games.update((list) => list.map((g) => (g.id === existing.id ? change(g) : g)));
    } else {
      const base: ScoreGame = {
        id: `g${Date.now()}`,
        ref,
        label,
        players,
        werewolves: [],
        outcomes: {},
      };
      this.games.update((list) => [...list, change(base)]);
    }
    this.persist();
  }

  setPlayerResult(
    ref: string,
    label: string,
    players: string[],
    name: string,
    side: WerewolfSide | null,
    won: boolean | null,
  ): void {
    const key = normalizePlatoId(name);
    this.upsertGame(ref, label, players, (game) => {
      const werewolves = game.werewolves.filter((w) => normalizePlatoId(w) !== key);
      if (side === 'werewolves') werewolves.push(name);
      const outcomes = { ...(game.outcomes ?? {}) };
      Object.keys(outcomes)
        .filter((k) => normalizePlatoId(k) === key)
        .forEach((k) => delete outcomes[k]);
      if (won !== null) outcomes[name] = won;
      return { ...game, players, werewolves, outcomes };
    });
  }

  applyWinningSide(ref: string, label: string, players: string[], winner: WerewolfSide): void {
    this.upsertGame(ref, label, players, (game) => {
      const wolves = new Set(game.werewolves.map(normalizePlatoId));
      const outcomes: Record<string, boolean> = {};
      players.forEach((p) => {
        const isWolf = wolves.has(normalizePlatoId(p));
        outcomes[p] = isWolf ? winner === 'werewolves' : winner === 'villagers';
      });
      return { ...game, players, outcomes, winner };
    });
  }

  removeGame(id: string): void {
    if (this.viewOnly()) return;
    this.games.update((list) => list.filter((g) => g.id !== id));
    this.persist();
  }

  setMark(
    ref: string,
    label: string,
    players: string[],
    name: string,
    mark: PlayerCategory | null,
  ): void {
    const key = normalizePlatoId(name);
    this.upsertGame(ref, label, players, (game) => {
      const marks = Object.fromEntries(
        Object.entries(game.marks ?? {}).filter(([n]) => normalizePlatoId(n) !== key),
      ) as Record<string, PlayerCategory>;
      if (mark) marks[name] = mark;
      return { ...game, players, marks };
    });
  }

  pointsOf(name: string): { total: number } {
    const key = normalizePlatoId(name);
    const row = this.leaderboard().find((r) => normalizePlatoId(r.name) === key);
    return { total: row?.points ?? 0 };
  }

  togglePlanned(name: string, selected: boolean): void {
    const current = this.plannedPlayers();
    const without = current.filter((n) => n !== name);
    this.nextPlayers.set(selected ? [...without, name] : without);
  }

  planGame(name: string): void {
    this.nextGame.set(name);
    this.nextPerMatch.set(null);
  }

  planSamePlayers(): void {
    this.nextPlayers.set(null);
  }

  planWinners(): void {
    const last = this.lastStage();
    this.nextPlayers.set(last ? stageWinners(last) : []);
  }

  planEveryone(): void {
    this.nextPlayers.set([...this.members()]);
  }

  planNobody(): void {
    this.nextPlayers.set([]);
  }

  advanceFree(): void {
    if (this.viewOnly()) return;
    const last = this.lastStage();
    if (!last || !isStageComplete(last)) return;
    const names = this.plannedPlayers();
    if (names.length < 2) {
      this.toast.show('Select at least 2 players for the next round.', 'accent');
      return;
    }
    const size = Math.max(2, this.plannedSize());
    const game = this.isMixed() ? (this.plannedGame() ?? '') : '';
    this.stages.update((stages) => [...stages, newStage(names, size, 1, stages.length + 1, game)]);
    this.nextPlayers.set(null);
    this.nextPerMatch.set(null);
    this.nextGame.set(null);
    this.persist();
  }

  private replaceLastStage(stage: BracketStage): void {
    this.stages.update((stages) => [...stages.slice(0, -1), stage]);
  }

  private persist(): void {
    if (this.viewOnly()) return;
    if (!this.tournamentId) return;
    const seq = ++this.saveSeq;
    const epoch = this.epoch;
    this.pendingSaves++;
    this.syncStatus.set('💾 Saving…');
    const state = buildForgeState(this.members(), this.stages(), this.thirdPlaceEnabled(), {
      perMatch: this.perMatch(),
      advance: this.advancePerMatch(),
      games: this.games(),
    });
    this.saveChain = this.saveChain.then(() => this.write(seq, epoch, state));
  }

  private async write(
    seq: number,
    epoch: number,
    state: ReturnType<typeof buildForgeState>,
  ): Promise<void> {
    try {
      if (epoch !== this.epoch) return;
      const expected = this.forgeStamp;
      const next = Math.max(Date.now(), expected + 1);
      const result = await this.tournaments.saveForgeState(
        this.tournamentId as string,
        state,
        this.auth.session(),
        { expected, next },
      );
      if (result === 'conflict') {
        await this.resolveConflict();
        return;
      }
      if (result === true) this.forgeStamp = next;
      if (seq !== this.saveSeq) return;
      this.syncStatus.set(result ? '☁️ Saved to tournament' : '⚠️ Not saved - check permissions');
      if (!result) {
        this.toast.show(
          '⚠️ Could not save - you may not have permission to edit this tournament.',
          'accent',
        );
      }
    } catch (err) {
      if (seq === this.saveSeq) this.syncStatus.set('⚠️ Could not save - check connection');
      this.toast.show(
        '⚠️ Could not save your changes - check your connection and try again.',
        'accent',
      );
      console.error(err);
    } finally {
      this.pendingSaves--;
    }
  }

  private async resolveConflict(): Promise<void> {
    this.epoch++;
    this.resolving = true;
    try {
      await this.load();
      this.toast.show(
        'This tournament was changed elsewhere (for example a participant was replaced). Loaded the latest - please redo your last pick.',
        'accent',
      );
    } finally {
      this.resolving = false;
    }
  }
}
