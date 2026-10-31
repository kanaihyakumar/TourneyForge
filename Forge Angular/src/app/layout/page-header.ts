import { ChangeDetectionStrategy, Component, HostListener, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tf-page-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()' },
  template: `
    <a class="logo-badge" routerLink="/" aria-hidden="true">{{ logo() }}</a>
    <a class="title-link" routerLink="/"><h1>TourneyForge</h1></a>
    <button
      type="button"
      class="menu"
      aria-controls="header-actions"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Close menu' : 'Open menu'"
      (click)="open.set(!open())"
    >
      {{ open() ? '✕' : '☰' }}
    </button>
    <p class="tagline">{{ subtitle() }}</p>
    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
    }
    <div id="header-actions" class="actions" (click)="onActionsClick($event)">
      <ng-content />
    </div>
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

    .menu {
      display: none;
      @include reset-button;
      grid-area: menu;
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: var(--bg);
      color: var(--accent-dark);
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
      @include neu-raised(4px);
    }

    :host(.open) .menu {
      @include neu-inset(3px);
    }

    .menu:focus-visible {
      @include focus-ring;
    }

    .backdrop {
      display: none;
    }

    @media (max-width: 640px) {
      :host {
        position: relative;
        z-index: 30;
        grid-template-columns: auto 1fr auto;
        grid-template-areas:
          'logo title menu'
          'logo tagline menu';
        column-gap: 12px;
        row-gap: 2px;
        margin-bottom: 18px;
      }

      .menu {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .title-link {
        align-self: end;
      }

      .tagline {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.35;
      }

      .title-link h1 {
        font-size: 1.3rem;
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 0;
      }

      .actions {
        display: none;
        position: absolute;
        z-index: 1;
        top: 54px;
        right: 0;
        width: min(100%, 300px);
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 8px;
        padding: 12px;
        @include neu-surface(5px, var(--radius-lg));
      }

      :host(.open) .actions {
        display: flex;
      }
    }
  `,
})
export class PageHeader {
  readonly logo = input('🎲');
  readonly subtitle = input('');

  protected readonly open = signal(false);

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.open.set(false);
  }

  protected onActionsClick(event: Event): void {
    if ((event.target as HTMLElement).closest('button, a')) this.open.set(false);
  }
}
