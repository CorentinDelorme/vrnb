import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('should render label with input', () => {
    render(<FormField label="Email" inputProps={{ type: 'email' }} />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('should show required indicator', () => {
    render(<FormField label="Name" required inputProps={{}} />);
    expect(screen.getByText('*')).toBeDefined();
  });

  it('should display error message', () => {
    render(<FormField label="Email" error="Invalid email" inputProps={{}} />);
    expect(screen.getByText('Invalid email')).toBeDefined();
  });

  it('should render custom children instead of Input', () => {
    render(
      <FormField label="Message">
        <textarea data-testid="custom-textarea" />
      </FormField>,
    );
    expect(screen.getByTestId('custom-textarea')).toBeDefined();
  });

  it('should show error with custom children', () => {
    render(
      <FormField label="Field" error="Required">
        <input type="text" />
      </FormField>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Required')).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(<FormField label="Test" className="mb-4" inputProps={{}} />);
    expect(container.firstElementChild?.className).toContain('mb-4');
  });
});
