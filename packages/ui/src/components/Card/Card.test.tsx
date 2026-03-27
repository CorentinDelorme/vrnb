import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('should render with title', () => {
    render(<Card title="Test Title">Content</Card>);
    expect(screen.getByText('Test Title')).toBeDefined();
  });

  it('should render children content', () => {
    render(<Card>Body content</Card>);
    expect(screen.getByText('Body content')).toBeDefined();
  });

  it('should render image when imageUrl is provided', () => {
    render(<Card imageUrl="/test.jpg" imageAlt="Test image">Content</Card>);
    const img = screen.getByAltText('Test image');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('/test.jpg');
  });

  it('should not render image when imageUrl is not provided', () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should render actions when provided', () => {
    render(<Card actions={<button>Click</button>}>Content</Card>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeDefined();
  });

  it('should apply card base classes', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('card');
    expect(card?.className).toContain('bg-base-100');
  });

  it('should apply compact class', () => {
    const { container } = render(<Card compact>Content</Card>);
    const body = container.querySelector('.card-body');
    expect(body?.className).toContain('p-4');
  });

  it('should apply custom className', () => {
    const { container } = render(<Card className="w-96">Content</Card>);
    expect(container.firstElementChild?.className).toContain('w-96');
  });
});
