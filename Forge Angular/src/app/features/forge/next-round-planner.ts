import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlatoIdPipe } from '../../core/pipes/plato-id.pipe';
import { tableSizes } from '../../core/utils/bracket';
import { Checkbox } from '../../shared/forms/checkbox';
import { Select } from '../../shared/forms/select';
import { Button } from '../../shared/ui/button';
import { Field } from '../../shared/ui/field';
import { ForgeStore } from './forge-store';

@Component({
  selector: 'tf-next-round-planner',
  imports: [FormsModule, Checkbox, Select, Button, Field, PlatoIdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './next-round-planner.html',
  styleUrl: './next-round-planner.scss',
})
export class NextRoundPlanner {
  protected readonly store = inject(ForgeStore);

  protected readonly sizeOptions = computed(() =>
    this.store
      .roundSizeOptions()
      .map((n) => ({ value: String(n), label: `${n} players per game` })),
  );
  protected readonly gameOptions = computed(() => {
    const names = [...new Set(this.store.mixedGames().map((m) => m.game))];
    return names.map((name) => ({ value: name, label: name }));
  });
  protected readonly roundGameLabel = computed(() =>
    this.store.isMixed() && this.store.plannedGame() ? ` · ${this.store.plannedGame()}` : '',
  );
  protected readonly roundNumber = computed(() => this.store.stages().length + 1);
  protected readonly count = computed(() => this.store.plannedPlayers().length);
  protected readonly summary = computed(() => {
    const count = this.count();
    if (count < 2) return 'Select at least 2 players.';
    const sizes = tableSizes(count, this.store.plannedSize());
    return sizes.length === 1
      ? `${count} players - 1 game of ${sizes[0]} players.`
      : `${count} players - ${sizes.length} games (${sizes.join(' + ')} players).`;
  });

  protected isSelected(name: string): boolean {
    return this.store.plannedPlayers().includes(name);
  }
}
