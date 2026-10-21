import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ChatLine } from '../../core/models/models';
import { InboxService } from '../../core/services/inbox.service';
import { LiveChatService } from '../../core/services/live-chat.service';
import { ToastService } from '../../core/services/toast.service';
import { ChatThread } from '../../shared/chat/chat-thread';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';

@Component({
  selector: 'tf-support-messages',
  imports: [Card, Button, ChatThread],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-card
      icon="💬"
      title="Message the admin"
      hint="Leave a message and the admin will reply here. These messages are saved."
    >
      @if (inbox.myThread() === undefined) {
        <p class="empty-note">Loading…</p>
      } @else {
        <tf-chat-thread
          [lines]="lines()"
          placeholder="Write a message to the admin"
          emptyText="No messages yet - say hi 👋"
          (sent)="send($event)"
        />
      }
      <div class="btn-row">
        <button type="button" tfButton size="sm" (click)="live.setDock(true)">
          🙋 Need an instant answer? Open live chat
        </button>
      </div>
    </tf-card>
  `,
})
export class SupportMessages {
  protected readonly inbox = inject(InboxService);
  protected readonly live = inject(LiveChatService);
  private readonly toast = inject(ToastService);

  readonly active = input(false);

  protected readonly lines = computed<ChatLine[]>(() =>
    (this.inbox.myThread()?.messages ?? []).map((m, i) => ({
      id: i,
      mine: m.from === 'organizer',
      text: m.text,
      at: m.at,
    })),
  );

  constructor() {
    effect(() => {
      if (this.active()) untracked(() => void this.open());
    });
  }

  private async open(): Promise<void> {
    try {
      await this.inbox.loadMine();
      await this.inbox.markRead();
    } catch (err) {
      console.error(err);
    }
  }

  protected async send(text: string): Promise<void> {
    try {
      const ok = await this.inbox.send(text);
      if (!ok) this.toast.show('Could not send the message.');
    } catch (err) {
      this.toast.show('Could not send the message - check your connection.');
      console.error(err);
    }
  }
}
