import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAX_CHAT_TEXT } from '../../core/config/constants';
import { ChatLine } from '../../core/models/models';
import { Button } from '../ui/button';

@Component({
  selector: 'tf-chat-thread',
  imports: [DatePipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #log class="log" role="log" aria-live="polite">
      @for (line of lines(); track line.id) {
        <div class="line" [class.mine]="line.mine">
          <div class="bubble">{{ line.text }}</div>
          <span class="time">
            {{ line.at | date: 'MMM d, h:mm a' }}
            @if (deletable() && line.ref) {
              <button
                type="button"
                class="del"
                aria-label="Delete message"
                (click)="removed.emit(line.ref)"
              >
                🗑️
              </button>
            }
          </span>
        </div>
      } @empty {
        <p class="empty">{{ emptyText() }}</p>
      }
    </div>
    <form class="composer" (submit)="submit($event)">
      <textarea
        #box
        rows="1"
        [attr.aria-label]="placeholder()"
        [placeholder]="placeholder()"
        [maxLength]="maxLength"
        [disabled]="disabled()"
        [value]="draft()"
        (input)="draft.set(box.value)"
        (keydown.enter)="onEnter($event)"
      ></textarea>
      <button type="submit" tfButton variant="primary" size="sm" [disabled]="!canSend()">
        Send
      </button>
    </form>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }

    .log {
      @include neu-well(4px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      min-height: 140px;
      max-height: var(--chat-log-max, 320px);
      overflow-y: auto;
    }

    .line {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      max-width: 85%;
    }

    .line.mine {
      align-self: flex-end;
      align-items: flex-end;
    }

    .bubble {
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.4;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      @include neu-surface(3px, var(--radius-md));
    }

    .mine .bubble {
      background: var(--accent);
      color: var(--accent-contrast);
    }

    .time {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-soft);
    }

    .del {
      @include reset-button;
      font-size: 0.72rem;
      padding: 0 4px;
      opacity: 0.7;
    }

    .del:hover,
    .del:focus-visible {
      opacity: 1;
    }

    .empty {
      margin: auto;
      text-align: center;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--text-soft);
    }

    .composer {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    textarea {
      @include field-well;
      @include field-control;
      flex: 1;
      min-width: 0;
      resize: none;
      max-height: 110px;
      line-height: 1.4;
    }
  `,
})
export class ChatThread {
  readonly lines = input.required<ChatLine[]>();
  readonly placeholder = input('Type a message…');
  readonly emptyText = input('No messages yet.');
  readonly disabled = input(false);
  readonly deletable = input(false, { transform: booleanAttribute });
  readonly sent = output<string>();
  readonly removed = output<string>();

  protected readonly maxLength = MAX_CHAT_TEXT;
  protected readonly draft = signal('');
  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');

  constructor() {
    effect(() => {
      this.lines();
      queueMicrotask(() => {
        const el = this.log().nativeElement;
        el.scrollTop = el.scrollHeight;
      });
    });
  }

  protected canSend(): boolean {
    return !this.disabled() && !!this.draft().trim();
  }

  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.submit(event);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text || this.disabled()) return;
    this.sent.emit(text);
    this.draft.set('');
  }
}
