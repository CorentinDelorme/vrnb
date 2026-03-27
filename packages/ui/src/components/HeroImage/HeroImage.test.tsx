import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroImage } from './HeroImage';

describe('HeroImage', () => {
  it('should render title', () => {
    render(<HeroImage imageUrl="/hero.jpg" title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('should render subtitle', () => {
    render(<HeroImage imageUrl="/hero.jpg" title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeDefined();
  });

  it('should set background image via style', () => {
    const { container } = render(<HeroImage imageUrl="/hero.jpg" title="Title" />);
    const hero = container.firstElementChild as HTMLElement;
    expect(hero.style.backgroundImage).toContain('/hero.jpg');
  });

  it('should have role img with aria-label', () => {
    render(<HeroImage imageUrl="/hero.jpg" imageAlt="Cycling route" />);
    expect(screen.getByRole('img', { name: 'Cycling route' })).toBeDefined();
  });

  it('should use title as aria-label fallback', () => {
    render(<HeroImage imageUrl="/hero.jpg" title="My Hero" />);
    expect(screen.getByRole('img', { name: 'My Hero' })).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(<HeroImage imageUrl="/hero.jpg" className="min-h-96" />);
    expect(container.firstElementChild?.className).toContain('min-h-96');
  });
});
