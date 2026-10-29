import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  defaultMixedEntries,
  findGame,
  formatSelectOptions,
  GameSetting,
  individualFormats,
  MIX_GAME_OPTIONS,
  newMixedEntry,
  toOptions,
} from '../../core/config/games';
import { MixedGameEntry, SelectOption } from '../../core/models/models';
import { Select } from '../../shared/forms/select';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';

@Component({
  selector: 'tf-mixed-games-editor',
  imports: [FormsModule, Select, Button, Field],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mixed-games-editor.html',
  styleUrl: './mixed-games-editor.scss',
})
export class MixedGamesEditor {
  readonly entries = model<MixedGameEntry[]>(defaultMixedEntries());

  protected readonly gameOptions = MIX_GAME_OPTIONS;

  protected modes(entry: MixedGameEntry): SelectOption[] {
    return toOptions(findGame(entry.game)?.modes ?? []);
  }

  protected formats(entry: MixedGameEntry): SelectOption[] {
    const game = findGame(entry.game);
    return game ? formatSelectOptions(individualFormats(game)) : [];
  }

  protected settings(entry: MixedGameEntry): GameSetting[] {
    return findGame(entry.game)?.settings ?? [];
  }

  protected settingOptions(setting: GameSetting): SelectOption[] {
    return toOptions(setting.options);
  }

  protected settingValue(entry: MixedGameEntry, setting: GameSetting): string {
    return entry.gameSettings[setting.label] ?? setting.options[0];
  }

  protected changeGame(index: number, name: string): void {
    this.patch(index, () => newMixedEntry(name));
  }

  protected setMode(index: number, gameMode: string): void {
    this.patch(index, (entry) => ({ ...entry, gameMode }));
  }

  protected setFormat(index: number, format: string): void {
    this.patch(index, (entry) => ({ ...entry, format }));
  }

  protected setSetting(index: number, label: string, value: string): void {
    this.patch(index, (entry) => ({
      ...entry,
      gameSettings: { ...entry.gameSettings, [label]: value },
    }));
  }

  protected add(): void {
    const used = new Set(this.entries().map((e) => e.game));
    const next = MIX_GAME_OPTIONS.find((o) => !used.has(o.value)) ?? MIX_GAME_OPTIONS[0];
    this.entries.update((list) => [...list, newMixedEntry(next.value)]);
  }

  protected remove(index: number): void {
    this.entries.update((list) => list.filter((_, i) => i !== index));
  }

  protected move(index: number, by: -1 | 1): void {
    this.entries.update((list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  private patch(index: number, change: (entry: MixedGameEntry) => MixedGameEntry): void {
    this.entries.update((list) => list.map((entry, i) => (i === index ? change(entry) : entry)));
  }
}
