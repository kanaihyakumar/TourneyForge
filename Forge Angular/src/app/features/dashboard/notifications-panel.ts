import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ChatLine } from '../../core/models/models';
import { InboxService } from '../../core/services/inbox.service';
import { LiveChatService } from '../../core/services/live-chat.service';
import { ToastService } from '../../core/services/toast.service';
import { ChatThread } from '../../shared/chat/chat-thread';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { ListRow } from '../../shared/ui/list-row';
import { PillButton } from '../../shared/ui/pill-button';
import { Tag } from '../../shared/ui/tag';

@Component({
  selector: 'tf-notifications-panel',
  imports: [DatePipe, Card, ListRow, Button, PillButton, Tag, ChatThread],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications-panel.html',
  styleUrl: './notifications-panel.scss',
})
export class NotificationsPanel {
  protected readonly live = inject(LiveChatService);
  protected readonly inbox = inject(InboxService);
  private readonly toast = inject(ToastService);

  readonly active = input(false);

  protected readonly openId = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected readonly requests = computed(() =>
    this.live.chats().filter((c) => c.status !== 'active'),
  );
  protected readonly running = computed(() =>
    this.live.chats().filter((c) => c.status === 'active'),
  );

  protected readonly thread = computed(() =>
    this.inbox.threads()?.find((t) => t.organizerId === this.openId()),
  );
  protected readonly lines = computed<ChatLine[]>(() =>
    (this.thread()?.messages ?? []).map((m, i) => ({
      id: i,
      ref: m.id,
      mine: m.from === 'admin',
      text: m.text,
      at: m.at,
    })),
  );

  constructor() {
    effect(() => {
      if (this.active()) untracked(() => void this.refresh());
    });
  }

  protected async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      await this.inbox.loadThreads();
    } catch (err) {
      this.toast.show('Could not load messages - check your connection.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  protected async openThread(organizerId: string): Promise<void> {
    this.openId.set(organizerId);
    try {
      await this.inbox.markRead(organizerId);
    } catch (err) {
      console.error(err);
    }
  }

  protected async reply(text: string): Promise<void> {
    const id = this.openId();
    if (!id) return;
    try {
      const ok = await this.inbox.reply(id, text);
      if (!ok) this.toast.show('Could not send the reply.');
    } catch (err) {
      this.toast.show('Could not send the reply - check your connection.');
      console.error(err);
    }
  }

  protected async deleteMessage(messageId: string): Promise<void> {
    const id = this.openId();
    if (!id || !confirm('Delete this message? This cannot be undone.')) return;
    await this.run(() => this.inbox.deleteMessage(id, messageId), 'Message deleted.');
    if (!this.thread()) this.openId.set(null);
  }

  protected async deleteConversation(): Promise<void> {
    const id = this.openId();
    const name = this.thread()?.organizerName || 'this organizer';
    if (!id || !confirm(`Delete the whole conversation with ${name}? This cannot be undone.`)) {
      return;
    }
    await this.run(() => this.inbox.deleteThread(id), 'Conversation deleted.');
    this.openId.set(null);
  }

  private async run(action: () => Promise<boolean>, done: string): Promise<void> {
    try {
      this.toast.show((await action()) ? done : 'Could not delete.');
    } catch (err) {
      this.toast.show('Could not delete - check your connection.');
      console.error(err);
    }
  }

  protected startChat(id: string): void {
    this.live.accept(id);
    this.live.setDock(true);
  }

  protected openChat(id: string): void {
    this.live.select(id);
    this.live.setDock(true);
  }

  protected closeChat(id: string, name: string): void {
    if (confirm(`Close the chat with ${name}? The conversation is not saved and will be gone.`)) {
      this.live.closeChat(id);
    }
  }
}
