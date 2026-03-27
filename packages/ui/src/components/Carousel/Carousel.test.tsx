import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Carousel, type CarouselItem } from './Carousel';

const mockItems: CarouselItem[] = [
  { id: '1', imageUrl: '/img1.jpg', alt: 'Image 1', label: 'First' },
  { id: '2', imageUrl: '/img2.jpg', alt: 'Image 2', label: 'Second' },
  { id: '3', imageUrl: '/img3.jpg', alt: 'Image 3' },
];

describe('Carousel', () => {
  it('should render all items', () => {
    render(<Carousel items={mockItems} autoScroll={false} />);
    expect(screen.getByAltText('Image 1')).toBeDefined();
    expect(screen.getByAltText('Image 2')).toBeDefined();
    expect(screen.getByAltText('Image 3')).toBeDefined();
  });

  it('should render labels when provided', () => {
    render(<Carousel items={mockItems} autoScroll={false} />);
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  it('should render links when href is provided', () => {
    const itemsWithLink: CarouselItem[] = [
      { id: '1', imageUrl: '/img.jpg', alt: 'Link Image', href: 'https://example.com' },
    ];
    render(<Carousel items={itemsWithLink} autoScroll={false} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('should return null for empty items', () => {
    const { container } = render(<Carousel items={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('should have carousel region', () => {
    render(<Carousel items={mockItems} autoScroll={false} />);
    expect(screen.getByRole('region', { name: 'Carousel' })).toBeDefined();
  });

  it('should apply custom className', () => {
    render(<Carousel items={mockItems} className="my-class" autoScroll={false} />);
    expect(screen.getByRole('region').className).toContain('my-class');
  });
});
