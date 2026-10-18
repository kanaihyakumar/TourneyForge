import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DEFAULT_TIMEZONE } from '../../core/config/constants';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { formatWithZone } from '../../core/utils/time';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ListRow } from '../../shared/ui/list-row';
import { StatusBadge } from '../../shared/ui/status-badge';

@Component({
  selector: 'tf-tournament-list',
  imports: [Card, ListRow, StatusBadge, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-list.html',
})
export class TournamentList {
  private readonly tournamentService = inject(TournamentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly forge = inject(ForgeImportService);

  readonly tournaments = input<Tournament[] | undefined>(undefined);
  readonly organizers = input<Organizer[]>([]);
  readonly error = input(false);
  readonly edit = output<string>();
  readonly viewParticipants = output<string>();
  readonly viewMatches = output<string>();
  readonly viewMessages = output<string>();
  readonly clearData = output<string>();
  readonly changed = output<void>();

  protected readonly busyId = signal<string | null>(null);

  protected hasBracket(t: Tournament): boolean {
    return (
      !!t.forgeState?.bracket?.stages?.length &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );
  }

  protected whenText(t: Tournament): string {
    return formatWithZone(t.startUTC, t.createdTZ || DEFAULT_TIMEZONE);
  }

  protected registeredText(t: Tournament): string {
    const capacity = t.teamCapacity ? '/' + t.teamCapacity : '';
    return `${t.registeredCount}${capacity}${t.teamSize === 2 ? ' teams' : ' participants'}`;
  }

  protected coManagers(t: Tournament): string {
    return t.managerIds
      .map((id) => this.organizers().find((o) => o.id === id)?.displayName ?? id)
      .join(', ');
  }

  protected async toggleCompleted(t: Tournament): Promise<void> {
    const nextCompleted = !t.completed;
    this.busyId.set(t.id);
    try {
      const result = await this.tournamentService.update(
        t.id,
        { completed: nextCompleted },
        this.auth.session(),
      );
      if (!result) {
        this.toast.show('Could not update - check permissions.');
        return;
      }
      this.toast.show(nextCompleted ? 'Tournament marked as completed.' : 'Tournament reopened.');
      this.changed.emit();
    } catch (err) {
      this.toast.show('Something went wrong updating the tournament.');
      console.error(err);
    } finally {
      this.busyId.set(null);
    }
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    await this.tournamentService.remove(id, this.auth.session());
    this.changed.emit();
    this.toast.show('Tournament deleted.');
  }
}
