import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../layout/page-header';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';

@Component({
  selector: 'tf-not-found-page',
  imports: [RouterLink, PageHeader, Card, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tf-page-header subtitle="Tournaments, groups & bragging rights - all in one arena." />
    <tf-card
      title="404 - Page Not Found"
      icon="🧭"
      hint="The page you're looking for doesn't exist. Check the URL and try again."
    >
      <a tfButton variant="primary" routerLink="/">🏠 Back to Home</a>
    </tf-card>
  `,
})
export class NotFoundPage {}
