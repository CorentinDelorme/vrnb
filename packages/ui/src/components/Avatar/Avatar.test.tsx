import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('should render image when src is provided', () => {
    render(<Avatar src="/photo.jpg" alt="User" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('/photo.jpg');
    expect(img.getAttribute('alt')).toBe('User');
  });

  it('should render placeholder when no src', () => {
    render(<Avatar placeholder="JD" />);
    expect(screen.getByText('JD')).toBeDefined();
  });

  it('should render fallback placeholder when no src and no initials', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeDefined();
  });

  it('should apply size classes', () => {
    const { container, rerender } = render(<Avatar size="sm" />);
    expect(container.querySelector('.w-8')).not.toBeNull();

    rerender(<Avatar size="lg" />);
    expect(container.querySelector('.w-16')).not.toBeNull();
  });

  it('should apply placeholder styles when no image', () => {
    const { container } = render(<Avatar placeholder="AB" />);
    expect(container.querySelector('.placeholder')).not.toBeNull();
    expect(container.querySelector('.bg-neutral')).not.toBeNull();
  });

  it('should apply custom className', () => {
    const { container } = render(<Avatar className="ring" />);
    expect(container.firstElementChild?.className).toContain('ring');
  });
});
