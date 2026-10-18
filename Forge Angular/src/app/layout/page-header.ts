import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tf-page-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="logo-badge" routerLink="/" aria-hidden="true">{{ logo() }}</a>
    <a class="title-link" routerLink="/"><h1>TourneyForge</h1></a>
    <p class="tagline">{{ subtitle() }}</p>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas:
        'logo title actions'
        'logo tagline actions';
      align-items: center;
      column-gap: 16px;
      margin-bottom: 28px;
    }

    .title-link {
      grid-area: title;
      align-self: end;
    }

    .tagline {
      grid-area: tagline;
      align-self: start;
    }

    @media (max-width: 640px) {
      :host {
        grid-template-columns: auto auto 1fr;
        grid-template-areas:
          'logo title actions'
          'tagline tagline tagline';
        column-gap: 12px;
        row-gap: 14px;
        margin-bottom: 22px;
      }

      .title-link {
        align-self: center;
      }

      .tagline {
        margin: 0;
      }

      .title-link h1 {
        font-size: 1.1rem;
      }

      .actions {
        justify-self: end;
        gap: 6px;
        min-width: 0;
        flex-wrap: nowrap;
      }
    }

    .logo-badge {
      grid-area: logo;
      @include neu-surface(8px, 18px);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      text-decoration: none;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.3rem, 2.4vw, 1.8rem);
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    .title-link {
      text-decoration: none;
      color: var(--text);
    }

    .tagline {
      margin: 2px 0 0;
      color: var(--text-soft);
      font-size: 0.92rem;
      font-weight: 600;
    }

    .actions {
      grid-area: actions;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
  `,
})
export class PageHeader {
  readonly logo = input('🎲');
  readonly subtitle = input('');
}
