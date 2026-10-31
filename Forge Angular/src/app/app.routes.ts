import { Routes } from '@angular/router';
import { LEGAL_DOCS } from './core/config/legal';

export const routes: Routes = [
  {
    path: '',
    title: 'TourneyForge - Tournaments',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'dashboard',
    title: 'TourneyForge - Dashboard',
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'forge',
    title: 'TourneyForge - Match Bracket',
    loadComponent: () => import('./features/forge/forge-page').then((m) => m.ForgePage),
  },
  {
    path: 'host',
    title: 'TourneyForge - Host Mode',
    loadComponent: () => import('./features/host/host-page').then((m) => m.HostPage),
  },
  ...LEGAL_DOCS.map((doc) => ({
    path: doc.id,
    title: `TourneyForge - ${doc.title}`,
    data: { doc: doc.id },
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
  })),
  {
    path: '**',
    title: 'Page Not Found',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
