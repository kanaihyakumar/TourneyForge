import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ClipboardService } from '../../core/services/clipboard.service';
import { ToastTone } from '../../core/services/toast.service';
import { Button } from './button';

@Component({
  selector: 'tf-chunk-copy',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      tfButton
      [size]="size()"
      [variant]="primary() ? 'primary' : 'default'"
      [disabled]="!chunks().length"
      (click)="copy()"
    >
      {{ buttonText() }}
    </button>
    @if (chunks().length > 1) {
      <span class="info">{{ info() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .info {
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--text-soft);
    }
  `,
})
export class ChunkCopy {
  private readonly clipboard = inject(ClipboardService);

  readonly chunks = input.required<string[]>();
  readonly label = input('Copy');
  readonly size = input<'md' | 'sm'>('sm');
  readonly primary = input(false, { transform: booleanAttribute });
  readonly tone = input<ToastTone>('dark');

  protected readonly index = signal(0);
  protected readonly current = computed(() =>
    Math.min(this.index(), Math.max(0, this.chunks().length - 1)),
  );
  protected readonly buttonText = computed(() =>
    this.chunks().length > 1
      ? `📋 ${this.label()} (part ${this.current() + 1}/${this.chunks().length})`
      : `📋 ${this.label()}`,
  );
  protected readonly info = computed(
    () => `${this.chunks()[this.current()]?.length ?? 0} chars · next click copies the next part`,
  );

  constructor() {
    effect(() => {
      this.chunks();
      untracked(() => this.index.set(0));
    });
  }

  protected copy(): void {
    const chunks = this.chunks();
    const at = this.current();
    if (!chunks.length) return;
    const last = at === chunks.length - 1;
    const message =
      chunks.length === 1
        ? 'Copied to clipboard!'
        : `Copied part ${at + 1} of ${chunks.length}${last ? ' - next click starts over' : ''}`;
    void this.clipboard.copy(chunks[at], message, this.tone());
    this.index.set(last ? 0 : at + 1);
  }
}
