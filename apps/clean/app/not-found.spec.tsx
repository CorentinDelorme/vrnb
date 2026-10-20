import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from './not-found';

/**
 * The clean 404 page is the deliberate divergence from the legacy SPA (spec #3, US 25):
 * an unknown URL must show a proper French 404 with a way back home.
 */
describe('NotFound page', () => {
  it('renders a French 404 heading', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeDefined();
  });

  it('explains that the page does not exist', () => {
    render(<NotFound />);
    expect(screen.getByText(/n'existe pas/)).toBeDefined();
  });

  it('links back to the home page', () => {
    render(<NotFound />);
    const link = screen.getByRole('link', { name: "Retour à l'accueil" });
    expect(link.getAttribute('href')).toBe('/');
  });
});
