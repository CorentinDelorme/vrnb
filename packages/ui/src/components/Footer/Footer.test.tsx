import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('should render copyright text', () => {
    render(<Footer copyright="©2026 VRNB" />);
    expect(screen.getByText('©2026 VRNB')).toBeDefined();
  });

  it('should render links', () => {
    render(
      <Footer
        links={
          <>
            <a href="/contact">Contact</a>
            <a href="/about">About</a>
          </>
        }
      />,
    );
    expect(screen.getByText('Contact')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
  });

  it('should render carousel content', () => {
    render(<Footer carousel={<div>Carousel content</div>} />);
    expect(screen.getByText('Carousel content')).toBeDefined();
  });

  it('should have footer landmark', () => {
    render(<Footer copyright="test" />);
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('should have footer navigation', () => {
    render(
      <Footer links={<a href="/">Link</a>} />,
    );
    expect(screen.getByRole('navigation', { name: 'Footer navigation' })).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(<Footer className="mt-auto" />);
    expect(container.querySelector('footer')?.className).toContain('mt-auto');
  });
});
