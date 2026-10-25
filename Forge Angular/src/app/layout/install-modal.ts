import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { INSTALL_GUIDE } from '../core/config/install';
import { InstallService } from '../core/services/install.service';
import { Button } from '../shared/ui/button';
import { Modal } from '../shared/ui/modal';
import { TabItem, Tabs } from '../shared/ui/tabs';

@Component({
  selector: 'tf-install-modal',
  imports: [Modal, Tabs, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-modal title="📲 Get the TourneyForge app" [maxWidth]="520" [(open)]="install.guideOpen">
      <div class="stack">
        <p class="pitch">{{ guide.pitch }}</p>
        <ul class="perks">
          @for (perk of guide.perks; track perk) {
            <li>{{ perk }}</li>
          }
        </ul>
        @if (install.nativePrompt()) {
          <div class="btn-row flush">
            <button type="button" tfButton variant="primary" (click)="start()">
              📲 Install the app
            </button>
          </div>
          <p class="field-note">Your browser can install it in one tap. No app store needed.</p>
        } @else {
          <tf-tabs [tabs]="tabs" [(active)]="tab" />
          <ol class="steps">
            @for (step of steps(); track $index) {
              <li>{{ step }}</li>
            }
          </ol>
          <p class="field-note">{{ note() }}</p>
        }
      </div>
    </tf-modal>
  `,
  styles: `
    @use 'mixins' as *;

    .pitch {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.5;
    }

    .perks,
    .steps {
      margin: 0;
      padding-left: 22px;
      line-height: 1.6;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-soft);
    }

    .steps {
      @include neu-well(3px);
      padding: 12px 14px 12px 34px;
    }

    li {
      margin-bottom: 4px;
    }
  `,
})
export class InstallModal {
  protected readonly install = inject(InstallService);
  protected readonly guide = INSTALL_GUIDE;
  protected readonly tabs: TabItem[] = [
    { id: 'ios', label: '🍎 iPhone / iPad' },
    { id: 'android', label: '🤖 Android' },
  ];
  protected readonly tab = signal(this.install.platform === 'ios' ? 'ios' : 'android');
  protected readonly steps = computed(
    () => INSTALL_GUIDE.steps[this.tab() === 'ios' ? 'ios' : 'android'],
  );
  protected readonly note = computed(() =>
    this.tab() === 'ios' ? INSTALL_GUIDE.iosNote : INSTALL_GUIDE.androidNote,
  );

  constructor() {
    effect(() => {
      if (this.install.guideOpen()) {
        untracked(() => this.tab.set(this.install.platform === 'ios' ? 'ios' : 'android'));
      }
    });
  }

  protected async start(): Promise<void> {
    this.install.guideOpen.set(false);
    await this.install.start();
  }
}
