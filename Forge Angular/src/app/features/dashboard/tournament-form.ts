import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  DEFAULT_CLOSING_MESSAGE,
  DEFAULT_TIMEZONE,
  LOCKED_NOTICE,
  WINNER_PLACES,
} from '../../core/config/constants';
import {
  CUSTOM_GAME,
  defaultMixedEntries,
  entryPerMatch,
  MIXED_GAME,
  mixedGameNames,
  CUSTOM_GAME_DEF,
  findGame,
  formatById,
  resolveFormat,
  GAME_OPTIONS,
  GameDef,
  GameSetting,
  playersPerTable,
  suggestedSlots,
  toOptions,
} from '../../core/config/games';
import { computeLeaderboard, DEFAULT_SCORING, scoringGames } from '../../core/utils/scoring';
import {
  ForgeState,
  MixedGameEntry,
  Organizer,
  ScoringConfig,
  Tournament,
  TournamentInput,
  TournamentUpdate,
  Winner,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { TimezoneService } from '../../core/services/timezone.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentLimitError, TournamentService } from '../../core/services/tournament.service';
import { deserializeStages, podiumFromSavedBracket } from '../../core/utils/bracket';
import { formatPlatoId } from '../../core/utils/plato';
import {
  formatInTimezone,
  localPartsToUtc,
  timezoneLabel,
  utcToLocalParts,
} from '../../core/utils/time';
import {
  registrationLabel,
  usesFreeRounds,
  winnersFromPodium,
  withPrizes,
} from '../../core/utils/tournament';
import { Checkbox } from '../../shared/forms/checkbox';
import { Input } from '../../shared/forms/input';
import { Select } from '../../shared/forms/select';
import { Textarea } from '../../shared/forms/textarea';
import { AddRow } from '../../shared/ui/add-row';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ChipList } from '../../shared/ui/chip-list';
import { Field } from '../../shared/ui/field';
import { MixedGamesEditor } from './mixed-games-editor';
import { PublishConfirmModal } from './publish-confirm-modal';

const POINT_FIELDS = [
  { key: 'villagersWin', label: 'Villagers - win points' },
  { key: 'villagersLose', label: 'Villagers - lose points' },
  { key: 'werewolvesWin', label: 'Werewolves - win points' },
  { key: 'werewolvesLose', label: 'Werewolves - lose points' },
  { key: 'proPoints', label: 'Pro - points added' },
  { key: 'nabPoints', label: 'Nab - points deducted' },
] as const;

const pointValues = (config: ScoringConfig) => ({
  villagersWin: String(config.villagersWin),
  villagersLose: String(config.villagersLose),
  werewolvesWin: String(config.werewolvesWin),
  werewolvesLose: String(config.werewolvesLose),
  proPoints: String(config.proPoints),
  nabPoints: String(config.nabPoints),
});

const toScoring = (values: ReturnType<typeof pointValues>, enabled: boolean): ScoringConfig => ({
  enabled,
  villagersWin: Number(values.villagersWin) || 0,
  villagersLose: Number(values.villagersLose) || 0,
  werewolvesWin: Number(values.werewolvesWin) || 0,
  werewolvesLose: Number(values.werewolvesLose) || 0,
  proPoints: Number(values.proPoints) || 0,
  nabPoints: Number(values.nabPoints) || 0,
});

@Component({
  selector: 'tf-tournament-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    Card,
    Field,
    Input,
    Select,
    Textarea,
    Checkbox,
    Button,
    AddRow,
    ChipList,
    MixedGamesEditor,
    PublishConfirmModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-form.html',
  styleUrl: './tournament-form.scss',
})
export class TournamentForm {
  private readonly tournaments = inject(TournamentService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthService);

  readonly editing = input<Tournament | null>(null);
  readonly organizers = input<Organizer[]>([]);
  readonly saved = output<void>();
  readonly cancelEdit = output<void>();

  protected readonly gameOptions = GAME_OPTIONS;
  protected readonly timezoneService = inject(TimezoneService);
  protected readonly timezoneOptions = this.timezoneService.options;
  protected readonly winnerPlaces = WINNER_PLACES;

  protected readonly form = this.fb.group({
    title: '',
    game: 'Carrom',
    customGame: '',
    gameMode: '',
    format: '1v1',
    slots: '32',
    points: this.fb.group(pointValues(DEFAULT_SCORING)),
    date: '',
    time: '',
    timezone: DEFAULT_TIMEZONE,
    regDate: '',
    regTime: '',
    announcement: '',
    details: '',
    sponsor: '',
    groupName: '',
    closingMessage: '',
    winners: this.fb.array(WINNER_PLACES.map(() => '')),
    prizes: this.fb.array(WINNER_PLACES.map(() => '')),
  });

  protected readonly settings = signal<Record<string, string>>({});
  private populating = false;
  protected readonly hosts = signal<string[]>([]);
  protected readonly managerIds = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly pulling = signal(false);
  protected readonly confirmOpen = signal(false);
  private pending: TournamentUpdate | null = null;

  protected readonly lockedNotice = LOCKED_NOTICE;
  protected readonly canPull = computed(() => {
    const tournament = this.editing();
    return !!tournament && !!this.resolveWinners(tournament, tournament.forgeState);
  });
  protected readonly winnersEditable = computed(() => {
    const tournament = this.editing();
    if (!tournament) return false;
    const started = !!tournament.forgeState?.bracket?.stages?.length;
    return (
      this.canPull() || tournament.winners.length > 0 || (started && usesFreeRounds(tournament))
    );
  });
  protected readonly resultsOnly = computed(() => !!this.editing()?.locked && !this.auth.isAdmin());
  protected readonly quota = resource({
    params: () => (this.auth.session()?.role === 'organizer' ? this.auth.session() : undefined),
    loader: async ({ params }) => {
      try {
        return await this.tournaments.quota(params);
      } catch {
        return null;
      }
    },
  });
  protected readonly quotaReached = computed(
    () => !this.editing() && !!this.quota.value()?.reached,
  );

  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly gameDef = computed<GameDef>(
    () => findGame(this.values().game ?? '') ?? CUSTOM_GAME_DEF,
  );
  protected readonly isCustomGame = computed(() => this.values().game === CUSTOM_GAME);
  protected readonly isMixed = computed(() => this.values().game === MIXED_GAME);
  protected readonly mixedEntries = signal<MixedGameEntry[]>(defaultMixedEntries());
  protected readonly modeOptions = computed(() => toOptions(this.gameDef().modes));
  protected readonly formatOptions = computed(() =>
    this.gameDef().formats.map((f) => ({ value: f.id, label: f.label })),
  );
  protected readonly pointFields = POINT_FIELDS;
  private readonly selectedFormat = computed(() =>
    formatById(this.gameDef(), this.values().format ?? ''),
  );

  protected readonly tableNote = computed(() => {
    const total = parseInt(String(this.values().slots), 10) || 0;
    const per = playersPerTable(this.selectedFormat());
    if (this.isMixed() || this.gameDef().freeForAll || per <= 2 || total <= 0 || total % per === 0)
      return '';
    return `💡 ${per} players play each match. ${total} slots isn't a multiple of ${per} - ${suggestedSlots(this.selectedFormat())} is suggested.`;
  });

  protected readonly timeCheck = computed(() => {
    const { date, time, timezone } = this.values();
    if (!date || !time || !timezone) return null;
    const utc = localPartsToUtc(date, time, timezone);
    if (!utc) return null;
    const display = this.timezoneService.selected();
    return {
      entered: `${formatInTimezone(utc, timezone)} (${timezoneLabel(timezone)})`,
      shown: `${formatInTimezone(utc, display)} (${timezoneLabel(display)})`,
      utc: formatInTimezone(utc, 'UTC'),
      sameZone: display === timezone,
    };
  });

  protected readonly regCheck = computed(() => {
    const { regDate, regTime, date, time, timezone } = this.values();
    if (!regDate && !regTime) return { kind: 'none' as const };
    if (!regDate || !regTime) return { kind: 'incomplete' as const };
    const opens = localPartsToUtc(regDate, regTime, timezone ?? DEFAULT_TIMEZONE);
    const start = date && time ? localPartsToUtc(date, time, timezone ?? DEFAULT_TIMEZONE) : 0;
    const display = this.timezoneService.selected();
    return {
      kind: start && opens >= start ? ('late' as const) : ('ok' as const),
      opens: `${formatInTimezone(opens, timezone ?? DEFAULT_TIMEZONE)} (${timezoneLabel(timezone ?? DEFAULT_TIMEZONE)})`,
      shown: `${formatInTimezone(opens, display)} (${timezoneLabel(display)})`,
      sameZone: display === timezone,
    };
  });

  protected clearRegistrationOpen(): void {
    this.form.patchValue({ regDate: '', regTime: '' });
  }

  protected readonly capacityNote = computed(() => {
    const { slots } = this.values();
    const total = parseInt(String(slots), 10) || 0;
    if (this.selectedFormat().teamSize !== 2 || total <= 0) return '';
    const teams = Math.floor(total / 2);
    return `👥 ${total} player slots = up to ${teams} team${teams === 1 ? '' : 's'} of 2.`;
  });

  protected readonly managerOptions = computed(() => {
    const session = this.auth.session();
    const assigned = this.managerIds();
    return this.organizers()
      .filter(
        (o) => session?.role === 'admin' || o.createdBy === session?.id || assigned.includes(o.id),
      )
      .map((organizer) => ({
        organizer,
        locked: session?.role !== 'admin' && organizer.createdBy !== session?.id,
      }));
  });

  protected readonly validateHost = (name: string): string | null =>
    this.hosts().some((h) => h.toLowerCase() === name.toLowerCase())
      ? 'That host is already added.'
      : null;

  protected settingOptions(setting: GameSetting) {
    return toOptions(setting.options);
  }

  protected setSetting(label: string, value: string): void {
    this.settings.update((map) => ({ ...map, [label]: value }));
  }

  private applySuggestedSlots(): void {
    const def = findGame(this.form.controls.game.value) ?? CUSTOM_GAME_DEF;
    const format = formatById(def, this.form.controls.format.value);
    this.form.controls.slots.setValue(String(suggestedSlots(format, !!def.freeForAll)));
  }

  private applyGameDefaults(): void {
    const def = findGame(this.form.controls.game.value) ?? CUSTOM_GAME_DEF;
    this.form.patchValue(
      {
        gameMode: def.modes[0] ?? '',
        format: def.formats[def.name === 'Werewolf' ? def.formats.length - 1 : 0].id,
      },
      { emitEvent: true },
    );
    this.settings.set(Object.fromEntries(def.settings.map((s) => [s.label, s.options[0]])));
    this.applySuggestedSlots();
    if (this.form.controls.game.value === MIXED_GAME && this.mixedEntries().length < 2) {
      this.mixedEntries.set(defaultMixedEntries());
    }
  }

  constructor() {
    this.form.controls.game.valueChanges.subscribe(() => {
      if (!this.populating) this.applyGameDefaults();
    });
    this.form.controls.format.valueChanges.subscribe(() => {
      if (!this.populating) this.applySuggestedSlots();
    });
    effect(() => {
      const tournament = this.editing();
      untracked(() => (tournament ? this.populate(tournament) : this.reset()));
    });
  }

  protected addHost(name: string): void {
    this.hosts.update((list) => [...list, name]);
  }

  protected removeHost(index: number): void {
    this.hosts.update((list) => list.filter((_, i) => i !== index));
  }

  protected toggleManager(id: string, checked: boolean): void {
    this.managerIds.update((ids) => {
      const without = ids.filter((x) => x !== id);
      return checked ? [...without, id] : without;
    });
  }

  protected useSuggestedMessage(): void {
    this.form.controls.closingMessage.setValue(DEFAULT_CLOSING_MESSAGE);
  }

  protected async pullBracketWinners(): Promise<void> {
    const tournament = this.editing();
    if (!tournament) return;
    this.pulling.set(true);
    try {
      const state = await this.tournaments.getForgeState(tournament.id);
      const pulled = this.resolveWinners(tournament, state);
      if (!pulled) {
        this.toast.show('No completed Match Bracket found for this tournament yet.');
        return;
      }
      this.setWinners(withPrizes(pulled.winners, tournament), true);
      this.toast.show(
        pulled.fromPoints
          ? 'Winners pulled from the points leaderboard!'
          : 'Winners pulled from the Match Bracket!',
      );
    } catch (err) {
      this.toast.show('Could not load the Match Bracket - check your connection.');
      console.error(err);
    } finally {
      this.pulling.set(false);
    }
  }

  private resolveWinners(
    tournament: Tournament,
    state: ForgeState | null | undefined,
  ): { winners: Winner[]; fromPoints: boolean } | null {
    if (!state) return null;
    if (tournament.scoring?.enabled && state.games?.length) {
      const rows = computeLeaderboard(
        tournament.registrations.map((r) => registrationLabel(r, tournament.teamSize)),
        scoringGames(state.games, deserializeStages(state.bracket?.stages ?? [])),
        tournament.scoring,
      )
        .filter((r) => r.games > 0)
        .slice(0, 4);
      if (rows.length) {
        return {
          winners: rows.map((r, i) => ({ place: i + 1, name: formatPlatoId(r.name) })),
          fromPoints: true,
        };
      }
    }
    const podium = podiumFromSavedBracket(state.bracket);
    return podium
      ? {
          winners: winnersFromPodium(podium).map((w) => ({ ...w, name: formatPlatoId(w.name) })),
          fromPoints: false,
        }
      : null;
  }

  protected async submit(): Promise<void> {
    const session = this.auth.session();
    const value = this.form.getRawValue();
    const editing = this.editing();
    if (editing && this.resultsOnly()) {
      await this.persist({
        winners: this.collectWinners(value.winners, value.prizes),
        closingMessage: value.closingMessage,
      });
      return;
    }
    if (this.quotaReached()) {
      this.toast.show('You have reached your tournament limit. Contact Speedy on Plato.');
      return;
    }
    const mixed = this.isMixed() ? this.mixedEntries() : [];
    if (this.isMixed() && mixed.length < 2) {
      this.toast.show('Add at least 2 games for a mixed tournament.');
      return;
    }
    const registrationOpensAt = this.registrationOpensAt(value);
    if (registrationOpensAt === null) return;
    const first = mixed[0];
    const input: TournamentInput = {
      title: value.title,
      game: this.isMixed()
        ? mixedGameNames(mixed)
        : this.isCustomGame()
          ? value.customGame.trim()
          : value.game,
      slots: value.slots,
      teamSize: this.isMixed() ? 1 : this.selectedFormat().teamSize,
      gameMode: this.isMixed() ? '' : value.gameMode,
      format: this.isMixed() ? first.format : this.selectedFormat().id,
      playersPerMatch: this.isMixed()
        ? (entryPerMatch(first) ?? 2)
        : this.selectedFormat().perMatch,
      gameSettings: this.isMixed() ? {} : { ...this.settings() },
      mixed,
      scoring: toScoring(value.points, !this.isMixed() && !!this.gameDef().scoring),
      announcement: value.announcement,
      details: value.details,
      sponsor: value.sponsor,
      groupName: value.groupName,
      closingMessage: value.closingMessage,
      winners: this.collectWinners(value.winners, value.prizes),
      hosts: [...this.hosts()],
      startUTC: localPartsToUtc(value.date, value.time, value.timezone),
      createdTZ: value.timezone,
      registrationOpensAt,
      ...(this.auth.canViewOrganizers() ? { managerIds: [...this.managerIds()] } : {}),
    };

    if (session?.role === 'organizer') {
      this.pending = editing ? { ...input, locked: true } : input;
      this.confirmOpen.set(true);
      return;
    }
    await this.persist(input);
  }

  protected async confirmPublish(): Promise<void> {
    const input = this.pending;
    this.pending = null;
    if (input) await this.persist(input);
  }

  protected cancelPublish(): void {
    this.pending = null;
  }

  private registrationOpensAt(value: ReturnType<typeof this.form.getRawValue>): number | null {
    if (!value.regDate && !value.regTime) return 0;
    if (!value.regDate || !value.regTime) {
      this.toast.show('Pick both a date and a time for when registration opens, or clear them.');
      return null;
    }
    const opens = localPartsToUtc(value.regDate, value.regTime, value.timezone);
    if (opens >= localPartsToUtc(value.date, value.time, value.timezone)) {
      this.toast.show('Registration must open before the tournament starts.');
      return null;
    }
    return opens;
  }

  private async persist(input: TournamentInput | TournamentUpdate): Promise<void> {
    const session = this.auth.session();
    const editing = this.editing();
    this.saving.set(true);
    try {
      const result = editing
        ? await this.tournaments.update(editing.id, input, session)
        : await this.tournaments.create(input as TournamentInput, session);
      this.toast.show(
        editing
          ? result
            ? 'Tournament updated!'
            : 'Could not update - this tournament is locked or you lack permission.'
          : 'Tournament published! It’s now live on the home page.',
      );
      if (editing && !result) return;
      this.reset();
      this.saved.emit();
      this.quota.reload();
    } catch (err) {
      this.toast.show(
        err instanceof TournamentLimitError
          ? 'You have reached your tournament limit. Contact Speedy on Plato.'
          : 'Something went wrong saving the tournament.',
      );
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  private collectWinners(names: string[], prizes: string[]): Winner[] {
    return names
      .map((name, i) => {
        const prize = (prizes[i] ?? '').trim();
        return {
          place: WINNER_PLACES[i].place,
          name: name.trim(),
          ...(prize ? { prize } : {}),
        };
      })
      .filter((w) => w.name);
  }

  private setWinners(winners: Winner[], withPrize = false): void {
    const byPlace = new Map(winners.map((w) => [w.place, w]));
    this.form.controls.winners.setValue(WINNER_PLACES.map((p) => byPlace.get(p.place)?.name ?? ''));
    if (withPrize) {
      this.form.controls.prizes.setValue(
        WINNER_PLACES.map((p) => byPlace.get(p.place)?.prize ?? ''),
      );
    }
  }

  private reset(): void {
    this.populating = true;
    this.form.reset();
    this.populating = false;
    this.applyGameDefaults();
    this.hosts.set([]);
    this.managerIds.set([]);
    this.mixedEntries.set(defaultMixedEntries());
  }

  private populate(t: Tournament): void {
    const zone = t.createdTZ || DEFAULT_TIMEZONE;
    const local = utcToLocalParts(t.startUTC, zone);
    const mixedTournament = t.mixed.length > 1;
    const known = mixedTournament ? null : findGame(t.game);
    const scoring = t.scoring;
    const opensAt = t.registrationOpensAt;
    this.populating = true;
    this.form.setValue({
      title: t.title,
      game: mixedTournament ? MIXED_GAME : known ? known.name : CUSTOM_GAME,
      customGame: known || mixedTournament ? '' : t.game,
      gameMode: t.gameMode,
      format: resolveFormat(known ?? CUSTOM_GAME_DEF, t).id,
      slots: String(t.slots),
      points: pointValues({ ...DEFAULT_SCORING, ...scoring }),
      date: local.date,
      time: local.time,
      timezone: zone,
      regDate: opensAt ? utcToLocalParts(opensAt, zone).date : '',
      regTime: opensAt ? utcToLocalParts(opensAt, zone).time : '',
      announcement: t.announcement,
      details: t.details,
      sponsor: t.sponsor || '',
      groupName: t.groupName || '',
      closingMessage: t.closingMessage || '',
      winners: WINNER_PLACES.map(() => ''),
      prizes: WINNER_PLACES.map(() => ''),
    });
    this.populating = false;
    const def = known ?? CUSTOM_GAME_DEF;
    this.settings.set({
      ...Object.fromEntries(def.settings.map((st) => [st.label, st.options[0]])),
      ...t.gameSettings,
    });
    this.mixedEntries.set(mixedTournament ? t.mixed.map((m) => ({ ...m })) : defaultMixedEntries());
    this.setWinners(t.winners);
    const prizeByPlace = new Map(t.winners.map((w) => [w.place, w.prize ?? '']));
    this.form.controls.prizes.setValue(WINNER_PLACES.map((p) => prizeByPlace.get(p.place) ?? ''));
    this.hosts.set([...t.hosts]);
    this.managerIds.set([...t.managerIds]);
  }
}
