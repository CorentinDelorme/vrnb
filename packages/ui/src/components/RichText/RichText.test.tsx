import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText';

describe('RichText', () => {
  it('should render HTML content', () => {
    render(<RichText content="<p>Hello world</p>" />);
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('should render formatted HTML', () => {
    render(<RichText content="<p><strong>Bold</strong> and <em>italic</em></p>" />);
    expect(screen.getByText('Bold')).toBeDefined();
    expect(screen.getByText('italic')).toBeDefined();
  });

  it('should return null for null content', () => {
    const { container } = render(<RichText content={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null for undefined content', () => {
    const { container } = render(<RichText />);
    expect(container.innerHTML).toBe('');
  });

  it('should apply prose class', () => {
    const { container } = render(<RichText content="<p>Text</p>" />);
    expect(container.firstElementChild?.className).toContain('prose');
  });

  it('should apply custom className', () => {
    const { container } = render(<RichText content="<p>Text</p>" className="prose-lg" />);
    expect(container.firstElementChild?.className).toContain('prose-lg');
  });
});
