import { booleanAttribute, ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Button } from '../shared/ui/button';
import { Tag } from '../shared/ui/tag';
import { Chip } from '../shared/ui/chip';

@Component({
  selector: 'tf-account-actions',
  imports: [RouterLink, Button, Tag, Chip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.session(); as session) {
      <tf-chip>
        👤 {{ session.displayName }} <tf-tag>{{ session.role }}</tf-tag>
      </tf-chip>
      @if (!hideDashboardLink()) {
        <a tfButton size="sm" routerLink="/dashboard">
          🛠️ {{ session.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard' }}
        </a>
      }
      <button type="button" tfButton size="sm" (click)="auth.logout()">Logout</button>
    } @else {
      <button type="button" tfButton variant="primary" size="sm" (click)="auth.openLogin()">
        🔐 <span class="long">Organizer / Admin</span>Login
      </button>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    @media (max-width: 480px) {
      .long {
        display: none;
      }
    }
  `,
})
export class AccountActions {
  protected readonly auth = inject(AuthService);
  readonly hideDashboardLink = input(false, { transform: booleanAttribute });
}
