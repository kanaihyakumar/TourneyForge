import { Directive, HostListener, inject } from '@angular/core';
import { ForgeStore } from './forge-store';

@Directive({ selector: '[tfForgeSync]' })
export class ForgeSync {
  private readonly store = inject(ForgeStore);

  constructor() {
    this.store.init();
  }

  @HostListener('window:focus')
  @HostListener('document:visibilitychange')
  protected onReturn(): void {
    if (document.visibilityState === 'visible') void this.store.refreshIfChanged();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.store.hasPendingSaves) return;
    event.preventDefault();
    event.returnValue = '';
  }
}
