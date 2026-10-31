import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FINISHED_NOTICE } from '../../core/config/constants';
import { StorageService } from '../../core/services/storage.service';
import { ForgeImportService } from '../../core/services/forge-import.service';
import { Tournament } from '../../core/models/models';
import { MessagesList } from '../../shared/tournament/messages-list';
import { RegistrationKeyPanel } from '../../shared/tournament/registration-key-panel';
import { Banner } from '../../shared/ui/banner';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { BracketPanel } from '../forge/bracket-panel';
import { ForgeStore } from '../forge/forge-store';
import { ForgeSync } from '../forge/forge-sync';
import { ParticipantsPanel } from '../forge/participants-panel';
import { ResultsPanel } from '../forge/results-panel';

const DOCK_KEY = 'tf_host_dock_min';

@Component({
  selector: 'tf-host-console',
  imports: [
    RouterLink,
    Banner,
    Button,
    Card,
    StatusBadge,
    MessagesList,
    RegistrationKeyPanel,
    ParticipantsPanel,
    BracketPanel,
    ResultsPanel,
  ],
  hostDirectives: [ForgeSync],
  providers: [ForgeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <div class="who">
        <tf-status-badge [status]="current().status" short />
        <strong class="name">{{ current().title }}</strong>
      </div>
      <div class="actions">
        <span class="sync" [class.failed]="syncFailed()">{{ store.syncStatus() }}</span>
        <a tfButton size="sm" routerLink="/host">🔀 Switch</a>
        <button type="button" tfButton size="sm" (click)="forge.launch(current().id)">
          🎲 Full Forge
        </button>
      </div>
    </div>
    @if (store.viewOnly()) {
      <tf-banner tone="warn" icon="🔒" flush>{{ finishedNotice }}</tf-banner>
    }
    <nav class="dock" [class.min]="minimized()" aria-label="Host Mode sections">
      <button
        type="button"
        class="toggle"
        [attr.aria-expanded]="!minimized()"
        [attr.aria-label]="minimized() ? 'Show Host Mode menu' : 'Hide Host Mode menu'"
        (click)="toggle()"
      >
        {{ minimized() ? '«' : '»' }}
      </button>
      @for (section of sections(); track section.id) {
        @if (!minimized()) {
          <button
            type="button"
            class="dock-btn"
            [class.on]="activeTab() === section.id"
            [attr.aria-current]="activeTab() === section.id ? 'page' : null"
            [attr.aria-label]="section.label"
            (click)="open(section.id)"
          >
            <span class="icon" aria-hidden="true">{{ section.icon }}</span>
            <span class="label">{{ section.label }}</span>
            @if (section.count !== null) {
              <span class="count">{{ section.count }}</span>
            }
          </button>
        }
      }
    </nav>

    <tf-card id="host-messages" [hidden]="activeTab() !== 'messages'">
      <tf-messages-list [tournament]="current()" />
    </tf-card>
    <tf-card id="host-players" [hidden]="activeTab() !== 'players'">
      <tf-participants-panel [showMessages]="false" />
    </tf-card>
    <tf-card id="host-key" [hidden]="activeTab() !== 'key'">
      <tf-registration-key-panel [tournament]="current()" (changed)="store.refresh()" />
    </tf-card>
    <tf-card id="host-bracket" [hidden]="activeTab() !== 'bracket'">
      <tf-bracket-panel />
    </tf-card>
    <tf-card id="host-results" [hidden]="activeTab() !== 'results'">
      @if (!store.winners().length && !current().closingMessage) {
        <p class="empty-note">
          Results and the thank-you message show up here once the bracket ends.
        </p>
      }
      <tf-results-panel showClosing />
    </tf-card>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }

    tf-card {
      scroll-margin-top: 12px;
    }

    .dock {
      position: fixed;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      padding: 8px 6px;
      background: var(--bg);
      border-radius: var(--radius-lg);
      @include neu-surface(5px, var(--radius-lg));
    }

    .dock.min {
      padding: 4px;
      background: transparent;
      box-shadow: none;
    }

    .toggle {
      @include reset-button;
      align-self: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg);
      color: var(--accent-dark);
      font-size: 1.2rem;
      font-weight: 900;
      line-height: 1;
      @include neu-raised(3px);
    }

    .toggle:focus-visible {
      @include focus-ring;
    }

    .dock-btn {
      @include reset-button;
      background: var(--bg);
      position: relative;
      width: 54px;
      padding: 8px 2px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      border-radius: var(--radius-md);
      color: var(--text-soft);
      font-weight: 800;
      @include neu-raised(3px);
    }

    .dock-btn.on {
      color: var(--accent-dark);
      @include neu-inset(3px);
    }

    .dock-btn:focus-visible {
      @include focus-ring;
    }

    .icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .label {
      font-size: 0.6rem;
      line-height: 1.1;
    }

    .count {
      position: absolute;
      top: -4px;
      right: -2px;
      min-width: 18px;
      padding: 1px 5px;
      border-radius: var(--radius-pill);
      background: var(--accent);
      color: var(--accent-contrast);
      font-size: 0.62rem;
      line-height: 1.3;
      text-align: center;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px 14px;
      margin-bottom: 14px;
    }

    .who {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .name {
      font-size: 1.05rem;
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    .actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sync {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-soft);
    }

    .sync.failed {
      color: var(--danger);
    }
  `,
})
export class HostConsole {
  protected readonly store = inject(ForgeStore);
  protected readonly forge = inject(ForgeImportService);
  protected readonly finishedNotice = FINISHED_NOTICE;

  readonly tournament = input.required<Tournament>();

  private readonly storage = inject(StorageService);
  protected readonly minimized = signal(this.storage.getString(DOCK_KEY) === '1');
  protected readonly chosen = signal<string | null>(null);
  protected readonly current = computed(() => this.store.tournament() ?? this.tournament());
  protected readonly activeTab = computed(
    () => this.chosen() ?? (this.tournament().status === 'completed' ? 'results' : 'messages'),
  );
  protected readonly syncFailed = computed(() => this.store.syncStatus().startsWith('⚠️'));
  protected readonly sections = computed(() => [
    { id: 'messages', icon: '💬', label: 'Messages', count: null as number | null },
    { id: 'players', icon: '👥', label: 'Players', count: this.current().registeredCount },
    { id: 'key', icon: '🔑', label: 'Key', count: null },
    { id: 'bracket', icon: '🏆', label: 'Bracket', count: null },
    { id: 'results', icon: '🎉', label: 'Results', count: null },
  ]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected toggle(): void {
    const next = !this.minimized();
    this.minimized.set(next);
    this.storage.setString(DOCK_KEY, next ? '1' : '0');
  }

  protected open(id: string): void {
    this.chosen.set(id);
    setTimeout(() =>
      this.host.nativeElement
        .querySelector(`#host-${id}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
    );
  }
}
