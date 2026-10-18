import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextModalId = 0;

@Component({
  selector: 'tf-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="overlay" (click)="onOverlayClick($event)">
        <div
          class="box"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [style.max-width.px]="maxWidth()"
        >
          <div class="head">
            <h2 [id]="titleId">{{ title() }}</h2>
            <button type="button" class="close" aria-label="Close" (click)="open.set(false)">
              ✕
            </button>
          </div>
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: `
    @use 'mixins' as *;

    .overlay {
      position: fixed;
      inset: 0;
      background: var(--overlay);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 5vh 16px;
      overflow-y: auto;
      z-index: 50;
    }

    .box {
      background: var(--bg);
      border-radius: var(--radius-lg);
      width: 100%;
      box-shadow:
        14px 14px 30px var(--modal-shadow-dark),
        -6px -6px 18px var(--shadow-light);
      padding: clamp(18px, 3vw, 30px);
      animation: modal-in 0.15s ease;
    }

    @keyframes modal-in {
      from {
        transform: translateY(8px);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }

    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 14px;
    }

    h2 {
      font-size: 1.2rem;
      font-weight: 900;
    }

    .close {
      @include reset-button;
      @include neu-surface(4px, 12px);
      width: 34px;
      height: 34px;
      font-size: 16px;
      font-weight: 900;
      color: var(--text-soft);
      flex-shrink: 0;
    }
  `,
})
export class Modal {
  readonly open = model(false);
  readonly title = input('');
  readonly maxWidth = input(560);

  protected readonly titleId = `tf-modal-title-${nextModalId++}`;

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.open.set(false);
  }
}
