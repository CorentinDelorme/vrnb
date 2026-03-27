import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryFilter } from './CategoryFilter';

const categories = ['Balade', 'Escapade', 'Formations'];

describe('CategoryFilter', () => {
  it('should render all categories as checkboxes', () => {
    render(<CategoryFilter categories={categories} />);
    expect(screen.getByText('Balade')).toBeDefined();
    expect(screen.getByText('Escapade')).toBeDefined();
    expect(screen.getByText('Formations')).toBeDefined();
  });

  it('should render search input', () => {
    render(<CategoryFilter categories={categories} />);
    expect(screen.getByPlaceholderText('Rechercher...')).toBeDefined();
  });

  it('should render filter button', () => {
    render(<CategoryFilter categories={categories} />);
    expect(screen.getByRole('button', { name: 'Filtrer' })).toBeDefined();
  });

  it('should toggle category selection', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CategoryFilter categories={categories} onCategoriesChange={handleChange} />);

    await user.click(screen.getByText('Balade'));
    expect(handleChange).toHaveBeenCalledWith(['Balade']);
  });

  it('should uncheck already selected category', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <CategoryFilter
        categories={categories}
        selectedCategories={['Balade']}
        onCategoriesChange={handleChange}
      />,
    );

    await user.click(screen.getByText('Balade'));
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('should update search text', async () => {
    const user = userEvent.setup();
    const handleSearch = vi.fn();
    render(<CategoryFilter categories={categories} onSearchChange={handleSearch} />);

    await user.type(screen.getByPlaceholderText('Rechercher...'), 'test');
    expect(handleSearch).toHaveBeenCalled();
  });

  it('should show checked state for selected categories', () => {
    render(
      <CategoryFilter categories={categories} selectedCategories={['Escapade']} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    const escapadeCheckbox = checkboxes[1] as HTMLInputElement;
    expect(escapadeCheckbox.checked).toBe(true);
  });

  it('should use custom labels', () => {
    render(
      <CategoryFilter
        categories={categories}
        filterLabel="Apply"
        searchPlaceholder="Find..."
      />,
    );
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDefined();
    expect(screen.getByPlaceholderText('Find...')).toBeDefined();
  });
});
