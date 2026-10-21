import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UsageService } from './core/services/usage.service';
import { ChatDock } from './layout/chat-dock';
import { LoginModal } from './layout/login-modal';
import { SiteFooter } from './layout/site-footer';
import { Toast } from './shared/ui/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginModal, Toast, SiteFooter, ChatDock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap"><router-outlet /></div>
    <tf-site-footer />
    <tf-login-modal />
    <tf-chat-dock />
    <tf-toast />
  `,
})
export class App {
  constructor() {
    inject(UsageService);
  }
}
