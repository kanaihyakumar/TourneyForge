import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  DEFAULT_CLOSING_MESSAGE,
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  WINNER_PLACES,
} from '../../core/config/constants';
import {
  CUSTOM_GAME,
  CUSTOM_GAME_DEF,
  findGame,
  formatById,
  GAME_OPTIONS,
  GameDef,
  GameSetting,
  playersPerTable,
  suggestedSlots,
  toOptions,
} from '../../core/config/games';
import { computeLeaderboard, DEFAULT_SCORING, scoringGames } from '../../core/utils/scoring';
import {
  Organizer,
  ScoringConfig,
  Tournament,
  TournamentInput,
  Winner,
} from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { deserializeStages, podiumFromSavedBracket } from '../../core/utils/bracket';
import { formatPlatoId } from '../../core/utils/plato';
import { localPartsToUtc, utcToLocalParts } from '../../core/utils/time';
import { registrationLabel, winnersFromPodium } from '../../core/utils/tournament';
import { Checkbox } from '../../shared/forms/checkbox';
import { Input } from '../../shared/forms/input';
import { Select } from '../../shared/forms/select';
import { Textarea } from '../../shared/forms/textarea';
import { AddRow } from '../../shared/ui/add-row';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ChipList } from '../../shared/ui/chip-list';
import { Field } from '../../shared/ui/field';

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
  protected readonly timezoneOptions = TIMEZONE_OPTIONS;
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
    announcement: '',
    details: '',
    sponsor: '',
    groupName: '',
    closingMessage: '',
    winners: this.fb.array(WINNER_PLACES.map(() => '')),
  });

  protected readonly settings = signal<Record<string, string>>({});
  private populating = false;
  protected readonly hosts = signal<string[]>([]);
  protected readonly managerIds = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly pulling = signal(false);

  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly gameDef = computed<GameDef>(
    () => findGame(this.values().game ?? '') ?? CUSTOM_GAME_DEF,
  );
  protected readonly isCustomGame = computed(() => this.values().game === CUSTOM_GAME);
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
    if (per <= 2 || total <= 0 || total % per === 0) return '';
    return `💡 ${per} players play each match. ${total} slots isn't a multiple of ${per} - ${suggestedSlots(this.selectedFormat())} is suggested.`;
  });

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
    this.form.controls.slots.setValue(String(suggestedSlots(format)));
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
      if (tournament.scoring?.enabled && state?.games?.length) {
        const rows = computeLeaderboard(
          tournament.registrations.map((r) => registrationLabel(r, tournament.teamSize)),
          scoringGames(state.games, deserializeStages(state.bracket?.stages ?? [])),
          tournament.scoring,
        )
          .filter((r) => r.games > 0)
          .slice(0, 4);
        this.setWinners(rows.map((r, i) => ({ place: i + 1, name: formatPlatoId(r.name) })));
        this.toast.show('Winners pulled from the points leaderboard!');
        return;
      }
      const podium = state ? podiumFromSavedBracket(state.bracket) : null;
      if (!podium) {
        this.toast.show('No completed Match Bracket found for this tournament yet.');
        return;
      }
      this.setWinners(
        winnersFromPodium(podium).map((w) => ({ ...w, name: formatPlatoId(w.name) })),
      );
      this.toast.show('Winners pulled from the Match Bracket!');
    } catch (err) {
      this.toast.show('Could not load the Match Bracket - check your connection.');
      console.error(err);
    } finally {
      this.pulling.set(false);
    }
  }

  protected async submit(): Promise<void> {
    const session = this.auth.session();
    const value = this.form.getRawValue();
    const input: TournamentInput = {
      title: value.title,
      game: this.isCustomGame() ? value.customGame.trim() : value.game,
      slots: value.slots,
      teamSize: this.selectedFormat().teamSize,
      gameMode: value.gameMode,
      format: this.selectedFormat().id,
      playersPerMatch: this.selectedFormat().perMatch,
      gameSettings: { ...this.settings() },
      scoring: toScoring(value.points, !!this.gameDef().scoring),
      announcement: value.announcement,
      details: value.details,
      sponsor: value.sponsor,
      groupName: value.groupName,
      closingMessage: value.closingMessage,
      winners: this.collectWinners(value.winners),
      hosts: [...this.hosts()],
      startUTC: localPartsToUtc(value.date, value.time, value.timezone),
      createdTZ: value.timezone,
      ...(this.auth.canViewOrganizers() ? { managerIds: [...this.managerIds()] } : {}),
    };

    this.saving.set(true);
    const editing = this.editing();
    try {
      const result = editing
        ? await this.tournaments.update(editing.id, input, session)
        : await this.tournaments.create(input, session);
      this.toast.show(
        editing
          ? result
            ? 'Tournament updated!'
            : 'Could not update - check permissions.'
          : 'Tournament published! It’s now live on the home page.',
      );
      this.reset();
      this.saved.emit();
    } catch (err) {
      this.toast.show('Something went wrong saving the tournament.');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  private collectWinners(names: string[]): Winner[] {
    return names
      .map((name, i) => ({ place: WINNER_PLACES[i].place, name: name.trim() }))
      .filter((w) => w.name);
  }

  private setWinners(winners: Winner[]): void {
    const byPlace = new Map(winners.map((w) => [w.place, w.name]));
    this.form.controls.winners.setValue(WINNER_PLACES.map((p) => byPlace.get(p.place) ?? ''));
  }

  private reset(): void {
    this.populating = true;
    this.form.reset();
    this.populating = false;
    this.applyGameDefaults();
    this.hosts.set([]);
    this.managerIds.set([]);
  }

  private populate(t: Tournament): void {
    const zone = t.createdTZ || DEFAULT_TIMEZONE;
    const local = utcToLocalParts(t.startUTC, zone);
    const known = findGame(t.game);
    const scoring = t.scoring;
    this.populating = true;
    this.form.setValue({
      title: t.title,
      game: known ? known.name : CUSTOM_GAME,
      customGame: known ? '' : t.game,
      gameMode: t.gameMode,
      format: t.format,
      slots: String(t.slots),
      points: pointValues({ ...DEFAULT_SCORING, ...scoring }),
      date: local.date,
      time: local.time,
      timezone: zone,
      announcement: t.announcement,
      details: t.details,
      sponsor: t.sponsor || '',
      groupName: t.groupName || '',
      closingMessage: t.closingMessage || '',
      winners: WINNER_PLACES.map(() => ''),
    });
    this.populating = false;
    const def = known ?? CUSTOM_GAME_DEF;
    this.settings.set({
      ...Object.fromEntries(def.settings.map((st) => [st.label, st.options[0]])),
      ...t.gameSettings,
    });
    this.setWinners(t.winners);
    this.hosts.set([...t.hosts]);
    this.managerIds.set([...t.managerIds]);
  }
}
