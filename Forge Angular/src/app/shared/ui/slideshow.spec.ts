import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Slideshow } from './slideshow';

@Component({
  imports: [Slideshow],
  template: `
    <tf-slideshow [count]="3" [intervalMs]="60" [(index)]="index">
      <p class="slide">Slide {{ index() }}</p>
    </tf-slideshow>
  `,
})
class Host {
  readonly index = signal(0);
}

describe('Slideshow', () => {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    return { fixture, root };
  };
  const press = async (
    fixture: { whenStable(): Promise<unknown> },
    root: HTMLElement,
    label: string,
  ) => {
    (root.querySelector(`[aria-label="${label}"]`) as HTMLElement).click();
    await fixture.whenStable();
  };

  it('steps with the arrows and dots and disables them at either end', async () => {
    const { fixture, root } = await setup();
    const prev = () => root.querySelector('[aria-label="Previous slide"]') as HTMLButtonElement;
    const next = () => root.querySelector('[aria-label="Next slide"]') as HTMLButtonElement;
    expect(prev().disabled).toBe(true);

    await press(fixture, root, 'Next slide');
    expect(root.querySelector('.slide')?.textContent).toContain('Slide 1');
    await press(fixture, root, 'Go to slide 3');
    expect(root.querySelector('.slide')?.textContent).toContain('Slide 2');
    expect(next().disabled).toBe(true);
    await press(fixture, root, 'Previous slide');
    expect(root.querySelector('.slide')?.textContent).toContain('Slide 1');
    expect(root.querySelectorAll('.dot.on').length).toBe(1);
  });

  it('autoplays until the last slide, and stops once the user takes over', async () => {
    const first = await setup();
    await wait(300);
    await first.fixture.whenStable();
    expect(first.root.querySelector('.slide')?.textContent).toContain('Slide 2');
    await wait(200);
    expect(first.root.querySelector('.slide')?.textContent).toContain('Slide 2');
    first.fixture.destroy();

    const second = await setup();
    await press(second.fixture, second.root, 'Next slide');
    await wait(300);
    await second.fixture.whenStable();
    expect(second.root.querySelector('.slide')?.textContent).toContain('Slide 1');
  });
});
