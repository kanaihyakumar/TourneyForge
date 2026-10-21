import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL_DOCS } from '../core/config/legal';

@Component({
  selector: 'tf-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Legal and contact">
      @for (doc of docs; track doc.id) {
        <a [routerLink]="'/' + doc.id">{{ doc.title }}</a>
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

    a:hover,
    a:focus-visible {
      color: var(--accent-dark);
      text-decoration: underline;
    }
  `,
})
export class SiteFooter {
  protected readonly docs = LEGAL_DOCS;
}
