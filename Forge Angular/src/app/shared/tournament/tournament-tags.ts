import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Tournament } from '../../core/models/models';
import { TimezoneService } from '../../core/services/timezone.service';
import { formatLabelFor } from '../../core/utils/tournament';
import { Tag } from '../ui/tag';

@Component({
  selector: 'tf-tournament-tags',
  imports: [Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mixedTags().length) {
      <tf-tag>🎲 Mixed</tf-tag>
      @for (entry of mixedTags(); track $index) {
        <tf-tag>🎮 {{ entry.text }}</tf-tag>
        @if (showSettings()) {
          @for (item of entry.settings; track item.label) {
            <tf-tag>⚙️ {{ entry.game }} · {{ item.label }}: {{ item.value }}</tf-tag>
          }
        }
      }
    } @else {
      <tf-tag>🎮 {{ tournament().game }}</tf-tag>
      @if (tournament().gameMode) {
        <tf-tag>🕹️ {{ tournament().gameMode }}</tf-tag>
      }
      @if (tournament().teamSize === 2 || tournament().playersPerMatch > 2) {
        <tf-tag>🎲 {{ formatLabel() }}</tf-tag>
      }
      @if (showSettings()) {
        @for (item of settingsList(); track item.label) {
          <tf-tag>⚙️ {{ item.label }}: {{ item.value }}</tf-tag>
        }
      }
    }
    @if (tournament().scoring?.enabled) {
      <tf-tag>⭐ Points system</tf-tag>
    }
    <tf-tag>⏰ {{ when() }}</tf-tag>
    <tf-tag>{{ registered() }}</tf-tag>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class TournamentTags {
  private readonly timezone = inject(TimezoneService);

  readonly tournament = input.required<Tournament>();
  readonly verbose = input(false, { transform: booleanAttribute });

  readonly showSettings = input(false, { transform: booleanAttribute });

  protected readonly formatLabel = computed(() => formatLabelFor(this.tournament()));
  protected readonly mixedTags = computed(() => {
    const entries = this.tournament().mixed;
    if (entries.length < 2) return [];
    return entries.map((entry) => {
      const label = formatLabelFor({
        game: entry.game,
        format: entry.format,
        teamSize: 1,
        playersPerMatch: 2,
      });
      const mode = entry.gameMode ? ` · ${entry.gameMode}` : '';
      return {
        game: entry.game,
        text: `${entry.game}${mode} · ${label}`,
        settings: Object.entries(entry.gameSettings).map(([k, value]) => ({ label: k, value })),
      };
    });
  });
  protected readonly settingsList = computed(() =>
    Object.entries(this.tournament().gameSettings).map(([label, value]) => ({ label, value })),
  );
  protected readonly when = computed(() => this.timezone.format(this.tournament().startUTC));
  protected readonly registered = computed(() => {
    const t = this.tournament();
    const capacity = t.teamCapacity ? '/' + t.teamCapacity : '';
    const unit = t.teamSize === 2 ? ' teams' : this.verbose() ? ' participants' : '';
    return `👥 ${t.registeredCount}${capacity}${unit}`;
  });
}
