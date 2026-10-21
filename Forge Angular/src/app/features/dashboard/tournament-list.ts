import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DEFAULT_TIMEZONE, LOCKED_NOTICE } from '../../core/config/constants';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { TimezoneService } from '../../core/services/timezone.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { formatWithZone } from '../../core/utils/time';
import { registrationState } from '../../core/utils/tournament';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ListRow } from '../../shared/ui/list-row';
import { Segmented, SegmentOption } from '../../shared/ui/segmented';
import { StatusBadge } from '../../shared/ui/status-badge';
import { Tag } from '../../shared/ui/tag';

@Component({
  selector: 'tf-tournament-list',
  imports: [Card, ListRow, StatusBadge, Button, Tag, Segmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-list.html',
})
export class TournamentList {
  private readonly tournamentService = inject(TournamentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly forge = inject(ForgeImportService);
  private readonly timezone = inject(TimezoneService);

  readonly tournaments = input<Tournament[] | undefined>(undefined);
  readonly organizers = input<Organizer[]>([]);
  readonly error = input(false);
  readonly edit = output<string>();
  readonly viewParticipants = output<string>();
  readonly viewMatches = output<string>();
  readonly viewMessages = output<string>();
  readonly clearData = output<string>();
  readonly assign = output<Tournament>();
  readonly changed = output<void>();

  protected readonly busyId = signal<string | null>(null);
  protected readonly lockedNotice = LOCKED_NOTICE;

  protected isLockedFor(t: Tournament): boolean {
    return t.locked && !this.auth.isAdmin();
  }

  protected async toggleLock(t: Tournament): Promise<void> {
    this.busyId.set(t.id);
    try {
      const result = await this.tournamentService.update(
        t.id,
        { locked: !t.locked },
        this.auth.session(),
      );
      if (!result) {
        this.toast.show('Could not update - check permissions.');
        return;
      }
      this.toast.show(
        t.locked
          ? 'Editing allowed. The organizer can edit and publish again.'
          : 'Tournament locked.',
      );
      this.changed.emit();
    } finally {
      this.busyId.set(null);
    }
  }

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

  protected readonly registrationOptions: SegmentOption[] = [
    { value: 'soon', label: '🔔 Soon', title: 'Show "Registration coming soon"' },
    { value: 'open', label: '⚔️ Open', title: 'Let players register' },
    { value: 'closed', label: '🔒 Closed', title: 'Stop new registrations' },
  ];

  protected regValue(t: Tournament): string | null {
    const state = registrationState(t, this.timezone.now());
    return state === 'ended' ? null : state;
  }

  protected async setRegistration(t: Tournament, mode: string): Promise<void> {
    const patch =
      mode === 'soon'
        ? { registrationSoon: true, registrationClosed: false }
        : mode === 'closed'
          ? { registrationSoon: false, registrationClosed: true }
          : { registrationSoon: false, registrationClosed: false, registrationOpensAt: 0 };
    this.busyId.set(t.id);
    try {
      const result = await this.tournamentService.update(t.id, patch, this.auth.session());
      if (!result) {
        this.toast.show('Could not update - check permissions.');
        return;
      }
      this.toast.show(
        mode === 'soon'
          ? 'Registration set to coming soon.'
          : mode === 'closed'
            ? 'Registration closed.'
            : 'Registration is open!',
      );
      this.changed.emit();
    } catch (err) {
      this.toast.show('Something went wrong updating registration.');
      console.error(err);
    } finally {
      this.busyId.set(null);
    }
  }

  protected registrationText(t: Tournament): string {
    if (t.status === 'completed' || t.status === 'cancelled') return '';
    if (t.registrationClosed) return '🔒 registration closed';
    if (t.registrationSoon && t.registrationOpensAt <= this.timezone.now()) {
      return '🔔 registration coming soon';
    }
    if (!t.registrationOpensAt) return '';
    const opens = formatWithZone(t.registrationOpensAt, t.createdTZ || DEFAULT_TIMEZONE);
    return t.registrationOpensAt > this.timezone.now()
      ? `🔔 registration opens ${opens}`
      : `🟢 registration opened ${opens}`;
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

  protected async remove(t: Tournament): Promise<void> {
    if (this.isLockedFor(t)) {
      this.toast.show(LOCKED_NOTICE);
      return;
    }
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    const removed = await this.tournamentService.remove(t.id, this.auth.session());
    this.changed.emit();
    this.toast.show(removed ? 'Tournament deleted.' : 'Could not delete this tournament.');
  }
}
