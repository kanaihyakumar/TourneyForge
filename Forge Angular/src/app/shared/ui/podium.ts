import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PodiumRow, Winner } from '../../core/models/models';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';
import { podiumRows } from '../../core/utils/tournament';

@Component({
  selector: 'tf-podium',
  imports: [PlatoIdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'variant()' },
  template: `
    <h3>{{ title() }}</h3>
    @for (row of rows(); track $index) {
      <div class="row">
        <span class="medal">{{ row.medal }}</span>
        <span>{{ row.name | platoId }}</span>
        @if (row.detail) {
          <span class="detail">{{ row.detail }}</span>
        }
        @if (row.prize) {
          <span class="prize">🎁 {{ row.prize }}</span>
        }
        <span class="place">{{ row.label }}</span>
      </div>
    }
    <ng-content />
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }

    :host(.inline) {
      @include neu-well(4px);
      padding: 16px 18px;
      margin-bottom: 12px;
    }

    :host(.results) {
      @include neu-surface(9px, var(--radius-lg));
      padding: 22px;
      margin-top: 10px;
    }

    h3 {
      font-weight: 900;
    }

    :host(.inline) h3 {
      margin: 0 0 10px;
      font-size: 0.98rem;
    }

    :host(.results) h3 {
      margin: 0 0 14px;
      font-size: 1.1rem;
      text-align: center;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      border-radius: var(--radius-sm);
      font-weight: 800;
    }

    :host(.inline) .row {
      padding: 8px 10px;
      @include neu-raised(3px);
      margin-bottom: 8px;
      font-size: 0.92rem;
    }

    :host(.results) .row {
      padding: 10px 14px;
      @include neu-inset(3px);
      margin-bottom: 10px;
    }

    :host(.inline) .row:last-of-type {
      margin-bottom: 0;
    }

    .medal {
      font-size: 1.2rem;
    }

    :host(.results) .medal {
      font-size: 1.3rem;
    }

    .detail {
      font-size: 0.74rem;
      font-weight: 800;
      color: var(--accent-dark);
    }

    .prize {
      font-size: 0.74rem;
      font-weight: 800;
      color: var(--success);
    }

    .place {
      margin-left: auto;
      font-size: 0.72rem;
      color: var(--text-soft);
      font-weight: 800;
      text-transform: uppercase;
    }
  `,
})
export class PodiumBox {
  readonly title = input('');
  readonly winners = input<Winner[]>([]);
  readonly variant = input<'inline' | 'results'>('inline');

  protected readonly rows = computed<PodiumRow[]>(() => podiumRows(this.winners()));
}
