import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { findLegalDoc, LEGAL_DOCS } from '../../core/config/legal';
import { PageHeader } from '../../layout/page-header';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';

@Component({
  selector: 'tf-legal-page',
  imports: [RouterLink, PageHeader, Card, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
})
export class LegalPage {
  private readonly data = toSignal(inject(ActivatedRoute).data, { requireSync: true });

  protected readonly doc = computed(() => findLegalDoc(this.data()['doc']) ?? LEGAL_DOCS[0]);
}
