import { Routes } from '@angular/router';

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
    path: '**',
    title: 'Page Not Found',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
