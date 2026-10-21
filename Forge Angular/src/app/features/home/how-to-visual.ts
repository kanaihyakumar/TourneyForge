import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DEMO_PLAYERS, DEMO_TOURNAMENT, HowToVisualId } from '../../core/config/how-to';
import { Badge } from '../../shared/ui/badge';
import { Button } from '../../shared/ui/button';
import { Tag } from '../../shared/ui/tag';

@Component({
  selector: 'tf-how-to-visual',
  imports: [Badge, Button, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './how-to-visual.html',
  styleUrl: './how-to-visual.scss',
})
export class HowToVisual {
  readonly id = input.required<HowToVisualId>();

  protected readonly demo = DEMO_TOURNAMENT;
  protected readonly players = DEMO_PLAYERS;
}
