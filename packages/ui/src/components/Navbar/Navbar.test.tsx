import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('should render with logo', () => {
    render(<Navbar logo={<span>VRNB</span>} />);
    expect(screen.getByText('VRNB')).toBeDefined();
  });

  it('should render menu items', () => {
    render(
      <Navbar
        menuItems={
          <>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
          </>
        }
      />,
    );
    // Menu items render twice (desktop + mobile dropdown)
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('About').length).toBeGreaterThanOrEqual(1);
  });

  it('should render actions', () => {
    render(<Navbar actions={<button>Login</button>} />);
    expect(screen.getByRole('button', { name: 'Login' })).toBeDefined();
  });

  it('should have navigation landmark', () => {
    render(<Navbar logo={<span>Test</span>} />);
    expect(screen.getByRole('navigation')).toBeDefined();
  });

  it('should have mobile menu button', () => {
    render(<Navbar logo={<span>Test</span>} />);
    expect(screen.getByLabelText('Open menu')).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(<Navbar className="sticky top-0" />);
    expect(container.querySelector('nav')?.className).toContain('sticky');
  });
});
