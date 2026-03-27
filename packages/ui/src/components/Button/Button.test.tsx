import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('should render children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('should apply primary variant class by default', () => {
    render(<Button>Test</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-primary');
  });

  it('should apply secondary variant class', () => {
    render(<Button variant="secondary">Test</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-secondary');
  });

  it('should apply outline variant class', () => {
    render(<Button variant="outline">Test</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-outline');
  });

  it('should apply ghost variant class', () => {
    render(<Button variant="ghost">Test</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-ghost');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">S</Button>);
    expect(screen.getByRole('button').className).toContain('btn-sm');

    rerender(<Button size="lg">L</Button>);
    expect(screen.getByRole('button').className).toContain('btn-lg');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('should show loading spinner when loading', () => {
    render(<Button isLoading>Loading</Button>);
    const spinner = screen.getByRole('button').querySelector('.loading-spinner');
    expect(spinner).toBeDefined();
  });
});
