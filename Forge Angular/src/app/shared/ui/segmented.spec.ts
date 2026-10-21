import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Segmented } from './segmented';

@Component({
  imports: [Segmented],
  template: `
    <tf-segmented
      label="Mode"
      [options]="options"
      [value]="value()"
      [disabled]="disabled()"
      (picked)="picks.push($event); value.set($event)"
    />
  `,
})
class Host {
  readonly options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  readonly value = signal('a');
  readonly disabled = signal(false);
  readonly picks: string[] = [];
}

describe('Segmented', () => {
  it('marks the current option and only reports real changes', async () => {
    const fixture = TestBed.createComponent(Host);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const radios = () => Array.from(root.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];

    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    radios()[0].click();
    radios()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.picks).toEqual(['b']);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(radios().every((r) => r.disabled)).toBe(true);
  });
});
