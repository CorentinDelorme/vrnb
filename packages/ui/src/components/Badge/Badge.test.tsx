import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('should render children text', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeDefined();
  });

  it('should apply default variant (no extra class)', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText('Test').className).toContain('badge');
  });

  it('should apply specified variant class', () => {
    render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary').className).toContain('badge-primary');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Badge size="sm">S</Badge>);
    expect(screen.getByText('S').className).toContain('badge-sm');

    rerender(<Badge size="lg">L</Badge>);
    expect(screen.getByText('L').className).toContain('badge-lg');
  });

  it('should include base badge class', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText('Test').className).toContain('badge');
  });

  it('should apply custom className', () => {
    render(<Badge className="ml-2">Test</Badge>);
    expect(screen.getByText('Test').className).toContain('ml-2');
  });
});
