import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  model,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CHAT_LIMIT } from '../../core/utils/bracket';
import { AuthService } from '../../core/services/auth.service';
import { TournamentService } from '../../core/services/tournament.service';
import {
  defaultCountdown,
  formatDuration,
  MESSAGE_TEMPLATES,
  MessageCategory,
  renderMessage,
  slotsLeftText,
} from '../../core/utils/messages';
import { Input } from '../forms/input';
import { Select } from '../forms/select';
import { ChunkCopy } from '../ui/chunk-copy';
import { Field } from '../ui/field';
import { Modal } from '../ui/modal';

const PINNED_IDS = ['registration', 'registration-full'];

const UNIT_OPTIONS = [
  { value: 'mins', label: 'minutes' },
  { value: 'hours', label: 'hours' },
];

@Component({
  selector: 'tf-messages-modal',
  imports: [FormsModule, Modal, Field, Input, Select, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal
      [title]="'💬 Suggested messages - ' + (tournament.value()?.title ?? '')"
      [maxWidth]="720"
      [open]="open()"
      (openChange)="onOpenChange($event)"
    >
      <p class="hint">
        Ready-to-send chat messages, kept within {{ limit }} characters. Tournament name and hosts
        are filled in for you.
      </p>
      <div class="form-grid inputs">
        <tf-field label="Group name" for="msgGroup">
          <tf-input
            inputId="msgGroup"
            placeholder="e.g. Your Plato Group"
            autocomplete="off"
            [ngModel]="group()"
            (ngModelChange)="group.set($event)"
          />
        </tf-field>
        <div class="starts">
          <tf-field label="Starts in" for="msgAmount">
            <tf-input
              inputId="msgAmount"
              type="number"
              [min]="0"
              [ngModel]="amount()"
              (ngModelChange)="amount.set($event)"
            />
          </tf-field>
          <tf-field label="Unit" for="msgUnit">
            <tf-select
              inputId="msgUnit"
              [options]="unitOptions"
              [ngModel]="unit()"
              (ngModelChange)="unit.set($event)"
            />
          </tf-field>
        </div>
      </div>
      @for (section of grouped(); track section.category) {
        <h3 class="category">{{ section.category }}</h3>
        @for (item of section.items; track item.id) {
          <div class="message">
            <div class="top">
              <strong>{{ item.label }}</strong>
              <span class="count" [class.over]="item.rendered.tooLong">
                {{ item.rendered.length }}/{{ limit }}
                @if (item.rendered.truncated) {
                  · name shortened
                }
              </span>
            </div>
            <p class="text">{{ item.rendered.text }}</p>
            <tf-chunk-copy [chunks]="[item.rendered.text]" label="Copy message" />
          </div>
        }
      }
    </tf-modal>
  `,
  styles: `
    @use 'mixins' as *;

    .inputs {
      margin-bottom: 8px;
    }

    .starts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .category {
      margin: 18px 0 10px;
      font-size: 0.95rem;
      font-weight: 900;
    }

    .message {
      @include neu-well(4px);
      padding: 14px 16px;
      margin-bottom: 12px;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.85rem;
      margin-bottom: 6px;
    }

    .count {
      font-weight: 800;
      color: var(--text-soft);
    }

    .count.over {
      color: var(--danger);
    }

    .text {
      margin: 0 0 10px;
      font-weight: 600;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
  `,
})
export class MessagesModal {
  private readonly tournaments = inject(TournamentService);
  private readonly auth = inject(AuthService);

  readonly tournamentId = model<string | null>(null);

  protected readonly limit = CHAT_LIMIT;
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly group = signal('');
  protected readonly amount = signal<string | number>(30);
  protected readonly unit = signal('mins');

  protected readonly tournament = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: ({ params }) => this.tournaments.get(params),
  });
  protected readonly key = resource({
    params: () => this.tournamentId() ?? undefined,
    loader: async ({ params }) => {
      try {
        return (await this.tournaments.getKey(params, this.auth.session())) ?? '';
      } catch {
        return '';
      }
    },
  });
  protected readonly open = computed(() => !!this.tournamentId() && !!this.tournament.value());

  protected readonly grouped = computed(() => {
    const t = this.tournament.value();
    if (!t) return [];
    const vars = {
      title: t.title,
      group: this.group().trim(),
      time: formatDuration(Number(this.amount()), this.unit() === 'hours' ? 'hours' : 'mins'),
      hosts: (t.hosts.length ? t.hosts : [t.organizerName || 'the host']).join(', '),
      slotsLeft: slotsLeftText(t.teamCapacity, t.registeredCount, t.teamSize === 2),
      key: this.key.hasValue() ? this.key.value() : '',
      link: location.origin,
    };
    const order: MessageCategory[] = [
      'Greeting',
      'Before the tour',
      'During the tour',
      'Crowd control',
      'Wrap up',
    ];
    const sections: { category: string; items: ReturnType<typeof withRendered> }[] = [];
    const withRendered = (list: typeof MESSAGE_TEMPLATES) =>
      list.map((m) => ({ ...m, rendered: renderMessage(m, vars) }));
    sections.push({
      category: '⭐ Registration - open and full',
      items: withRendered(MESSAGE_TEMPLATES.filter((m) => PINNED_IDS.includes(m.id))),
    });
    for (const category of order) {
      sections.push({
        category,
        items: withRendered(
          MESSAGE_TEMPLATES.filter((m) => m.category === category && !PINNED_IDS.includes(m.id)),
        ),
      });
    }
    return sections;
  });

  constructor() {
    effect(() => {
      const t = this.tournament.value();
      if (!t) return;
      untracked(() => {
        const countdown = defaultCountdown(t.startUTC);
        this.group.set(t.groupName || '');
        this.amount.set(countdown.amount);
        this.unit.set(countdown.unit);
      });
    });
  }

  protected onOpenChange(open: boolean): void {
    if (!open) this.tournamentId.set(null);
  }
}
