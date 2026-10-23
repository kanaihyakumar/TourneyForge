import {
  ChangeDetectionStrategy,
  Component,
  effect,
  model,
  signal,
  untracked,
} from '@angular/core';
import { computed } from '@angular/core';
import { GROUP_GUIDE_SLIDES, HOW_TO_SLIDES, SITE_LINK_TOKEN } from '../../core/config/how-to';
import { ChunkCopy } from '../../shared/ui/chunk-copy';
import { Modal } from '../../shared/ui/modal';
import { Slideshow } from '../../shared/ui/slideshow';
import { TabItem, Tabs } from '../../shared/ui/tabs';
import { HowToVisual } from './how-to-visual';

@Component({
  selector: 'tf-how-to-modal',
  imports: [Modal, Slideshow, HowToVisual, Tabs, ChunkCopy],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-to-modal.html',
  styleUrl: './how-to-modal.scss',
})
export class HowToModal {
  readonly open = model(false);

  protected readonly tabs: TabItem[] = [
    { id: 'app', label: '🛠️ Using the site' },
    { id: 'group', label: '👥 Running it in your group' },
  ];
  protected readonly appSlides = HOW_TO_SLIDES;
  protected readonly groupSlides = GROUP_GUIDE_SLIDES;
  protected readonly tab = signal('app');
  protected readonly index = signal(0);
  protected readonly count = computed(() =>
    this.tab() === 'app' ? this.appSlides.length : this.groupSlides.length,
  );
  protected readonly link = typeof location === 'undefined' ? '' : location.origin;

  constructor() {
    effect(() => {
      this.tab();
      untracked(() => this.index.set(0));
    });
    effect(() => {
      if (!this.open()) {
        untracked(() => {
          this.tab.set('app');
          this.index.set(0);
        });
      }
    });
  }

  protected render(text: string): string {
    return text.replace(SITE_LINK_TOKEN, this.link);
  }
}
