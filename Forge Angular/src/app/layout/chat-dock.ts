import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { InboxService } from '../core/services/inbox.service';
import { LiveChatService } from '../core/services/live-chat.service';
import { ChatThread } from '../shared/chat/chat-thread';
import { Button } from '../shared/ui/button';

@Component({
  selector: 'tf-chat-dock',
  imports: [RouterLink, ChatThread, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-dock.html',
  styleUrl: './chat-dock.scss',
})
export class ChatDock {
  protected readonly auth = inject(AuthService);
  protected readonly live = inject(LiveChatService);
  protected readonly inbox = inject(InboxService);

  protected readonly badge = computed(() => this.live.attention() + this.inbox.unread());

  protected closeChat(id: string, name: string): void {
    if (
      confirm(
        `Close the chat with ${name}? The conversation is not saved and will be gone for both of you.`,
      )
    ) {
      this.live.closeChat(id);
    }
  }

  protected waitedFor(since: number): string {
    const minutes = Math.floor((Date.now() - since) / 60000);
    return minutes < 1 ? 'just now' : `${minutes} min ago`;
  }
}
