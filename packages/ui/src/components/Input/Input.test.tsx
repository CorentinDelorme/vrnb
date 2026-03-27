import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('should render with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('should render without label', () => {
    render(<Input placeholder="Search" />);
    expect(screen.getByPlaceholderText('Search')).toBeDefined();
  });

  it('should display error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Invalid email')).toBeDefined();
  });

  it('should apply error class when error is provided', () => {
    render(<Input label="Email" error="Error" />);
    expect(screen.getByLabelText('Email').className).toContain('input-error');
  });

  it('should set aria-invalid when error is provided', () => {
    render(<Input label="Email" error="Error" />);
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });

  it('should show required indicator', () => {
    render(<Input label="Name" required />);
    const input = screen.getByLabelText(/Name/);
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('should handle text input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input label="Name" onChange={handleChange} />);
    await user.type(screen.getByLabelText('Name'), 'test');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Input label="Test" size="sm" />);
    expect(screen.getByLabelText('Test').className).toContain('input-sm');

    rerender(<Input label="Test" size="lg" />);
    expect(screen.getByLabelText('Test').className).toContain('input-lg');
  });
});
