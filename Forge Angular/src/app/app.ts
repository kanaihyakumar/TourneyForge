import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UsageService } from './core/services/usage.service';
import { LoginModal } from './layout/login-modal';
import { Toast } from './shared/ui/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginModal, Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap"><router-outlet /></div>
    <tf-login-modal />
    <tf-toast />
  `,
})
export class App {
  constructor() {
    inject(UsageService);
  }
}
