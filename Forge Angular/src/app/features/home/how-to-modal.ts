import {
  ChangeDetectionStrategy,
  Component,
  effect,
  model,
  signal,
  untracked,
} from '@angular/core';
import { HOW_TO_SLIDES } from '../../core/config/how-to';
import { Modal } from '../../shared/ui/modal';
import { Slideshow } from '../../shared/ui/slideshow';
import { HowToVisual } from './how-to-visual';

@Component({
  selector: 'tf-how-to-modal',
  imports: [Modal, Slideshow, HowToVisual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal title="❓ How to use TourneyForge" [maxWidth]="680" [(open)]="open">
      @if (open()) {
        <tf-slideshow [count]="slides.length" [(index)]="index">
          @let slide = slides[index()];
          <div class="slide">
            <div class="meta">
              <span class="icon" aria-hidden="true">{{ slide.icon }}</span>
              <div>
                <h3>{{ index() + 1 }}. {{ slide.title }}</h3>
                <p class="audience">{{ slide.audience }}</p>
              </div>
            </div>
            <tf-how-to-visual [id]="slide.id" />
            <ol>
              @for (step of slide.steps; track $index) {
                <li>{{ step }}</li>
              }
            </ol>
          </div>
        </tf-slideshow>
      }
    </tf-modal>
  `,
  styles: `
    .slide {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 420px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon {
      font-size: 1.6rem;
    }

    h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 900;
    }

    .audience {
      margin: 2px 0 0;
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--accent-dark);
    }

    ol {
      margin: 0;
      padding-left: 22px;
      line-height: 1.6;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-soft);
    }

    li {
      margin-bottom: 4px;
    }
  `,
})
export class HowToModal {
  readonly open = model(false);

  protected readonly slides = HOW_TO_SLIDES;
  protected readonly index = signal(0);

  constructor() {
    effect(() => {
      if (!this.open()) untracked(() => this.index.set(0));
    });
  }
}
