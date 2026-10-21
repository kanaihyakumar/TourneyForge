import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { Button } from './button';

@Component({
  selector: 'tf-slideshow',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="stage"
      role="group"
      aria-roledescription="slide"
      [attr.aria-label]="'Slide ' + (index() + 1) + ' of ' + count()"
      (mouseenter)="hovering.set(true)"
      (mouseleave)="hovering.set(false)"
      (focusin)="hovering.set(true)"
      (focusout)="hovering.set(false)"
    >
      <ng-content />
    </div>
    <div class="controls">
      <button
        type="button"
        tfButton
        size="sm"
        aria-label="Previous slide"
        [disabled]="index() === 0"
        (click)="go(index() - 1)"
      >
        ◀
      </button>
      <div class="dots" role="tablist">
        @for (dot of dots(); track dot) {
          <button
            type="button"
            role="tab"
            class="dot"
            [class.on]="dot === index()"
            [attr.aria-selected]="dot === index()"
            [attr.aria-label]="'Go to slide ' + (dot + 1)"
            (click)="go(dot)"
          ></button>
        }
      </div>
      <button
        type="button"
        tfButton
        size="sm"
        aria-label="Next slide"
        [disabled]="index() === count() - 1"
        (click)="go(index() + 1)"
      >
        ▶
      </button>
    </div>
    <div class="auto">
      <button type="button" class="toggle" (click)="toggleAuto()">
        {{ playing() ? '⏸️ Pause autoplay' : '▶️ Autoplay' }}
      </button>
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .dots {
      display: flex;
      gap: 8px;
    }

    .dot {
      @include reset-button;
      @include neu-inset(2px);
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .dot.on {
      background: var(--accent);
      width: 26px;
      border-radius: var(--radius-pill);
    }

    .auto {
      text-align: center;
    }

    .toggle {
      @include reset-button;
      font-size: 0.76rem;
      font-weight: 800;
      color: var(--text-soft);
    }
  `,
})
export class Slideshow {
  readonly count = input.required<number>();
  readonly index = model(0);
  readonly intervalMs = input(9000);

  protected readonly hovering = signal(false);
  protected readonly playing = signal(true);
  protected readonly dots = () => Array.from({ length: this.count() }, (_, i) => i);

  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly reduceMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    if (this.reduceMotion) this.playing.set(false);
    effect(() => {
      const idx = this.index();
      const active = this.playing() && !this.hovering();
      const last = idx >= this.count() - 1;
      untracked(() => {
        clearTimeout(this.timer);
        if (active && !last)
          this.timer = setTimeout(() => this.go(idx + 1, true), this.intervalMs());
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected go(next: number, automatic = false): void {
    if (!automatic) this.playing.set(false);
    this.index.set(Math.min(Math.max(next, 0), this.count() - 1));
  }

  protected toggleAuto(): void {
    this.playing.update((on) => !on);
  }
}
