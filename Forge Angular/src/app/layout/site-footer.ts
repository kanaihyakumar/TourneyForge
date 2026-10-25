import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_DOCS } from '../core/config/legal';
import { InstallService } from '../core/services/install.service';

@Component({
  selector: 'tf-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Legal and contact">
      @for (doc of docs; track doc.id) {
        <a [routerLink]="'/' + doc.id">{{ doc.title }}</a>
      }
      @if (install.available()) {
        <button type="button" class="get-app" (click)="install.start()">📲 Get the app</button>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      padding: 4px 0 28px;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 18px;
    }

    a {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-soft);
      text-decoration: none;
    }

    .get-app {
      all: unset;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 900;
      color: var(--accent-dark);
    }

    .get-app:hover,
    .get-app:focus-visible {
      text-decoration: underline;
    }

    a:hover,
    a:focus-visible {
      color: var(--accent-dark);
      text-decoration: underline;
    }
  `,
})
export class SiteFooter {
  protected readonly docs = LEGAL_DOCS;
  protected readonly install = inject(InstallService);
}
