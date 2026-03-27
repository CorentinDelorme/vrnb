'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';

export interface CarouselItem {
  /** Unique key */
  id: string;
  /** Image URL */
  imageUrl: string;
  /** Alt text */
  alt?: string;
  /** Optional link URL */
  href?: string;
  /** Optional label displayed below the image */
  label?: string;
}

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /** Items to display */
  items: CarouselItem[];
  /** Enable auto-scroll */
  autoScroll?: boolean;
  /** Auto-scroll interval in ms */
  interval?: number;
}

/** Carousel component with optional auto-scroll */
export function Carousel({
  items,
  autoScroll = true,
  interval = 4000,
  className = '',
  ...props
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scrollNext = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollLeft + clientWidth >= scrollWidth - 1) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: clientWidth / 2, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!autoScroll || isPaused || items.length <= 1) return;
    const timer = setInterval(scrollNext, interval);
    return () => clearInterval(timer);
  }, [autoScroll, isPaused, interval, scrollNext, items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className={`carousel gap-4 w-full ${className}`}
      ref={scrollRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Carousel"
      {...props}
    >
      {items.map((item) => (
        <div key={item.id} className="carousel-item">
          {item.href ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              <img src={item.imageUrl} alt={item.alt || item.label || ''} className="rounded-box" />
              {item.label && <p className="text-center text-sm mt-1">{item.label}</p>}
            </a>
          ) : (
            <div>
              <img src={item.imageUrl} alt={item.alt || item.label || ''} className="rounded-box" />
              {item.label && <p className="text-center text-sm mt-1">{item.label}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
