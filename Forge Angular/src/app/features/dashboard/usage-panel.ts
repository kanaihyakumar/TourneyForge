import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FREE_QUOTA, USAGE_WARN_RATIO } from '../../core/config/constants';
import { StorageEstimate, Tournament, UsageDay } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { dayKey, UsageService } from '../../core/services/usage.service';
import { estimateBytes, formatBytes } from '../../core/utils/size';
import { Input } from '../../shared/forms/input';
import { Field } from '../../shared/ui/field';
import { Checkbox } from '../../shared/forms/checkbox';
import { Banner } from '../../shared/ui/banner';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ListRow } from '../../shared/ui/list-row';
import { Meter } from '../../shared/ui/meter';
import { ClearDataModal } from './clear-data-modal';

const DAY_MS = 86400000;

@Component({
  selector: 'tf-usage-panel',
  imports: [
    Field,
    Input,
    ReactiveFormsModule,
    FormsModule,
    StatusBadge,
    Card,
    Meter,
    Banner,
    Button,
    Checkbox,
    ListRow,
    ClearDataModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usage-panel.html',
  styleUrl: './usage-panel.scss',
})
export class UsagePanel {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly usage = inject(UsageService);

  readonly tournamentList = input<Tournament[]>([]);
  readonly changed = output<void>();
  protected readonly selected = signal<string[]>([]);

  protected readonly quota = FREE_QUOTA;
  protected readonly warnRatio = USAGE_WARN_RATIO;
  protected readonly format = formatBytes;
  protected readonly storage = signal<StorageEstimate | null>(null);
  protected readonly estimating = signal(false);
  protected readonly clearingId = signal<string | null>(null);
  protected readonly bulkBusy = signal(false);
  protected readonly bulk = inject(FormBuilder).nonNullable.group({
    registrations: true,
    forgeState: true,
    winners: false,
    closingMessage: false,
    details: false,
  });

  protected readonly today = computed(() => {
    this.usage.days();
    return this.usage.today();
  });
  protected readonly from = signal(dayKey(new Date(Date.now() - 6 * DAY_MS)));
  protected readonly to = signal(dayKey());
  protected readonly range = computed(() => {
    const stored = this.usage.days();
    const todayKey = dayKey();
    const live = { ...stored, [todayKey]: this.today() };
    const [start, end] = [this.from(), this.to()].sort();
    const days = Object.entries(live)
      .filter(([key]) => (!start || key >= start) && (!end || key <= end))
      .sort(([a], [b]) => b.localeCompare(a));
    const sum = (pick: (d: UsageDay) => number) => days.reduce((acc, [, d]) => acc + pick(d), 0);
    const max = (pick: (d: UsageDay) => number) =>
      days.reduce((acc, [, d]) => Math.max(acc, pick(d)), 0);
    return {
      days,
      total: {
        reads: sum((d) => d.reads),
        writes: sum((d) => d.writes),
        deletes: sum((d) => d.deletes),
      },
      peak: {
        reads: max((d) => d.reads),
        writes: max((d) => d.writes),
        deletes: max((d) => d.deletes),
      },
    };
  });
  protected readonly level = computed(() => {
    this.usage.days();
    return this.usage.worstLevel();
  });

  constructor() {
    void this.refresh();
  }

  protected preset(days: number): void {
    this.from.set(dayKey(new Date(Date.now() - (days - 1) * DAY_MS)));
    this.to.set(dayKey());
  }

  protected async refresh(): Promise<void> {
    await this.usage.flush();
    await this.usage.load();
  }

  protected async estimate(): Promise<void> {
    this.estimating.set(true);
    try {
      this.storage.set(await this.usage.estimateStorage());
    } catch (err) {
      this.toast.show('Could not estimate storage - check your connection.');
      console.error(err);
    } finally {
      this.estimating.set(false);
    }
  }

  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: string, checked: boolean): void {
    this.selected.update((ids) => {
      const without = ids.filter((x) => x !== id);
      return checked ? [...without, id] : without;
    });
  }

  protected selectAll(): void {
    this.selected.set(this.tournamentList().map((t) => t.id));
  }

  protected selectFinished(): void {
    this.selected.set(
      this.tournamentList()
        .filter((t) => t.status === 'completed' || t.status === 'cancelled')
        .map((t) => t.id),
    );
  }

  protected sizeOf(t: Tournament): string {
    return formatBytes(estimateBytes(t.registrations) + estimateBytes(t.forgeState ?? null));
  }

  protected async clearSelected(): Promise<void> {
    const options = this.bulk.getRawValue();
    const ids = this.selected();
    if (!ids.length || !Object.values(options).some(Boolean)) return;
    if (
      !confirm(
        `Clear the selected data from ${ids.length} tournament${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    )
      return;
    this.bulkBusy.set(true);
    try {
      const count = await this.tournaments.clearMany(ids, options, this.auth.session());
      this.toast.show(`Cleared data from ${count} tournament${count === 1 ? '' : 's'}.`);
      this.selected.set([]);
      this.changed.emit();
      if (this.storage()) await this.estimate();
    } catch (err) {
      this.toast.show('Something went wrong clearing the data.');
      console.error(err);
    } finally {
      this.bulkBusy.set(false);
    }
  }

  protected async deleteSelected(): Promise<void> {
    const ids = this.selected();
    if (!ids.length) return;
    const titles = this.tournamentList()
      .filter((t) => ids.includes(t.id))
      .map((t) => `• ${t.title}`)
      .join('\n');
    if (
      !confirm(
        `Permanently delete ${ids.length} tournament${ids.length === 1 ? '' : 's'} and all of ${ids.length === 1 ? 'its' : 'their'} data?\n\n${titles}\n\nThis cannot be undone.`,
      )
    )
      return;
    this.bulkBusy.set(true);
    try {
      const count = await this.tournaments.removeMany(ids, this.auth.session());
      this.toast.show(`Deleted ${count} tournament${count === 1 ? '' : 's'}.`);
      this.selected.set([]);
      this.changed.emit();
      if (this.storage()) await this.estimate();
    } catch (err) {
      this.toast.show('Something went wrong deleting the tournaments.');
      console.error(err);
    } finally {
      this.bulkBusy.set(false);
    }
  }

  protected async onCleared(): Promise<void> {
    this.changed.emit();
    await this.estimate();
  }
}
