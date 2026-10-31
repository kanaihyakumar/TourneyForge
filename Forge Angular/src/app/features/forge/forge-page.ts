import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FINISHED_NOTICE } from '../../core/config/constants';
import { ContactLine } from '../../layout/contact-line';
import { CreditLine } from '../../layout/credit-line';
import { PageHeader } from '../../layout/page-header';
import { MessagesModal } from '../../shared/tournament/messages-modal';
import { Banner } from '../../shared/ui/banner';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { BracketPanel } from './bracket-panel';
import { ForgeStore } from './forge-store';
import { ForgeSync } from './forge-sync';
import { ParticipantsPanel } from './participants-panel';
import { ScoringPanel } from './scoring-panel';

@Component({
  selector: 'tf-forge-page',
  imports: [
    RouterLink,
    PageHeader,
    CreditLine,
    ContactLine,
    Card,
    Banner,
    Button,
    BracketPanel,
    ParticipantsPanel,
    ScoringPanel,
    MessagesModal,
  ],
  hostDirectives: [ForgeSync],
  providers: [ForgeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forge-page.html',
  styleUrl: './forge-page.scss',
})
export class ForgePage {
  protected readonly finishedNotice = FINISHED_NOTICE;

  protected readonly store = inject(ForgeStore);

  protected readonly importText = computed(() => {
    const imported = this.store.imported;
    return imported
      ? `Building the bracket for "${imported.title}" - ${this.store.members().length} participant(s) loaded below.`
      : '';
  });
  protected readonly messagesId = signal<string | null>(null);
  protected readonly syncFailed = computed(() => this.store.syncStatus().startsWith('⚠️'));
}
