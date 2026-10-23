import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Button } from '../../shared/ui/button';
import { HowToModal } from './how-to-modal';

@Component({
  selector: 'tf-how-to',
  imports: [Button, HowToModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.session()) {
      <button type="button" tfButton size="sm" (click)="open.set(true)">❓ How to use</button>
      <tf-how-to-modal [(open)]="open" />
    }
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class HowTo {
  protected readonly auth = inject(AuthService);
  protected readonly open = signal(false);
}
