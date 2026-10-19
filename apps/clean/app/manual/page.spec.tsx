import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ManualPage from './page';

/**
 * Port of the legacy Angular `manual.spec.ts` (spec #3, seam Vitest): the three
 * `it()` cases assert the rendered copy — French typography spacing rules and
 * the P2 walkthrough example — through the page's public output (DOM text).
 */
describe('Manual page', () => {
  it('renders the illustrated mode d\u2019emploi content', () => {
    const { container } = render(<ManualPage />);
    expect(container).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Le principe en 3 temps' })).toBeDefined();
  });

  it('should use correct French spacing (no space after apostrophe or before comma)', () => {
    const { container } = render(<ManualPage />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toMatch(/' /);
    expect(text).not.toMatch(/ ,/);
    expect(text).not.toMatch(/ \./);
  });

  it('should explain the P2 completion example', () => {
    const { container } = render(<ManualPage />);
    const text = container.textContent ?? '';
    expect(text).toContain('Bruz Sud P2');
    expect(text.toLowerCase()).toContain('reprendre');
    expect(text).toContain('Menu');
  });
});
