import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  ADMIN_OWNER_ID,
  ADMIN_OWNER_NAME,
  DEFAULT_TIMEZONE,
  FINISHED_NOTICE,
} from '../../core/config/constants';
import { Organizer, Tournament } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { ClipboardService } from '../../core/services/clipboard.service';
import { TimezoneService } from '../../core/services/timezone.service';
import { ToastService } from '../../core/services/toast.service';
import { TournamentService } from '../../core/services/tournament.service';
import { formatWithZone } from '../../core/utils/time';
import { registrationFullMessage, registrationMessage } from '../../core/utils/messages';
import { isFull, isViewOnlyFor, registrationState } from '../../core/utils/tournament';
import { Button } from '../../shared/ui/button';
import { InstallApp } from '../../layout/install-app';
import { HowTo } from '../help/how-to';
import { Card } from '../../shared/ui/card';
import { ListRow } from '../../shared/ui/list-row';
import { Segmented, SegmentOption } from '../../shared/ui/segmented';
import { StatusBadge } from '../../shared/ui/status-badge';
import { Tag } from '../../shared/ui/tag';

@Component({
  selector: 'tf-tournament-list',
  imports: [Card, ListRow, StatusBadge, Button, Tag, Segmented, HowTo, InstallApp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-list.html',
  styles: `
    .aside {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
  `,
})
export class TournamentList {
  private readonly tournamentService = inject(TournamentService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly forge = inject(ForgeImportService);
  private readonly timezone = inject(TimezoneService);
  private readonly clipboard = inject(ClipboardService);

  readonly tournaments = input<Tournament[] | undefined>(undefined);
  readonly organizers = input<Organizer[]>([]);
  readonly error = input(false);
  readonly edit = output<string>();
  readonly viewParticipants = output<string>();
  readonly viewMatches = output<string>();
  readonly viewMessages = output<string>();
  readonly clearData = output<string>();
  readonly assign = output<Tournament>();
  readonly create = output<void>();
  readonly viewKey = output<Tournament>();
  readonly changed = output<void>();

  protected readonly busyId = signal<string | null>(null);

  protected isLockedFor(t: Tournament): boolean {
    return (t.locked || this.viewOnly(t)) && !this.auth.isAdmin();
  }

  protected viewOnly(t: Tournament): boolean {
    return isViewOnlyFor(this.auth.session(), t);
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

  protected readonly isFull = isFull;

  protected readonly registrationOptions: SegmentOption[] = [
    { value: 'soon', label: '🔔 Soon', title: 'Show "Registration coming soon"' },
    { value: 'open', label: '⚔️ Open', title: 'Let players register' },
    { value: 'closed', label: '🔒 Closed', title: 'Stop new registrations' },
  ];

  protected regValue(t: Tournament): string | null {
    const state = registrationState(t, this.timezone.now());
    return state === 'ended' ? null : state;
  }

  protected async copyRegistrationMessage(t: Tournament): Promise<void> {
    if (isFull(t)) {
      await this.clipboard.copy(
        registrationFullMessage(t),
        'Registration full message copied! Paste it in your group.',
        'accent',
      );
      return;
    }
    this.busyId.set(t.id);
    try {
      const key = t.keyRequired
        ? await this.tournamentService.getKey(t.id, this.auth.session())
        : '';
      if (t.keyRequired && !key) {
        this.toast.show('Could not load the registration key.');
        return;
      }
      await this.clipboard.copy(
        registrationMessage(t, key ?? '', location.origin),
        'Registration message copied! Paste it in your group.',
        'accent',
      );
    } catch (err) {
      this.toast.show('Could not copy the message - check your connection.');
      console.error(err);
    } finally {
      this.busyId.set(null);
    }
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
            : 'Registration is open! Tap 📋 Copy registration message to share it.',
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
      .map((id) => this.organizers().find((o) => o.id === id)?.displayName)
      .filter(Boolean)
      .join(', ');
  }

  protected assignedTo(t: Tournament): string {
    if (!t.organizerId || t.organizerId === ADMIN_OWNER_ID) return ADMIN_OWNER_NAME;
    return this.organizers().find((o) => o.id === t.organizerId)?.displayName ?? t.organizerName;
  }

  protected async toggleCompleted(t: Tournament): Promise<void> {
    if (this.viewOnly(t)) {
      this.toast.show(FINISHED_NOTICE);
      return;
    }
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
    if (!this.auth.isAdmin() || !confirm('Delete this tournament? This cannot be undone.')) return;
    const removed = await this.tournamentService.remove(t.id, this.auth.session());
    this.changed.emit();
    this.toast.show(removed ? 'Tournament deleted.' : 'Could not delete this tournament.');
  }
}
