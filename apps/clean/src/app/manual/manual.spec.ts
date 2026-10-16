import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Manual } from './manual';

describe('Manual', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Manual],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Manual);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use correct French spacing (no space after apostrophe or before comma)', async () => {
    const fixture = TestBed.createComponent(Manual);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
    expect(text).not.toMatch(/' /);
    expect(text).not.toMatch(/ ,/);
    expect(text).not.toMatch(/ \./);
  });
  it('should explain the P2 completion example', async () => {
    const fixture = TestBed.createComponent(Manual);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bruz Sud P2');
    expect(text.toLowerCase()).toContain('reprendre');
    expect(text).toContain('Menu');
  });
});
