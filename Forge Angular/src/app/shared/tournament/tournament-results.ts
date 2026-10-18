import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../core/models/models';
import { Banner } from '../ui/banner';
import { PodiumBox } from '../ui/podium';

@Component({
  selector: 'tf-tournament-results',
  imports: [PodiumBox, Banner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tournament().winners.length) {
      <tf-podium title="🏆 Here are the winners!" [winners]="tournament().winners" />
    }
    @if (tournament().closingMessage) {
      <tf-banner icon="💌" flush
        ><span class="message">{{ tournament().closingMessage }}</span></tf-banner
      >
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .message {
      white-space: pre-line;
    }
  `,
})
export class TournamentResults {
  readonly tournament = input.required<Tournament>();
}
