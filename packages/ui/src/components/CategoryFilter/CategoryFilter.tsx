'use client';

import { useState, useCallback } from 'react';
import type { HTMLAttributes } from 'react';

export interface CategoryFilterProps extends HTMLAttributes<HTMLDivElement> {
  /** Available categories to display */
  categories: string[];
  /** Currently selected categories */
  selectedCategories?: string[];
  /** Callback when selected categories change */
  onCategoriesChange?: (categories: string[]) => void;
  /** Current search text */
  searchText?: string;
  /** Callback when search text changes */
  onSearchChange?: (text: string) => void;
  /** Label for the filter button */
  filterLabel?: string;
  /** Label for the search input */
  searchPlaceholder?: string;
}

/** Shared category filter component with checkboxes and search field */
export function CategoryFilter({
  categories,
  selectedCategories: controlledSelected,
  onCategoriesChange,
  searchText: controlledSearch,
  onSearchChange,
  filterLabel = 'Filtrer',
  searchPlaceholder = 'Rechercher...',
  className = '',
  ...props
}: CategoryFilterProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const [internalSearch, setInternalSearch] = useState('');

  const selected = controlledSelected ?? internalSelected;
  const search = controlledSearch ?? internalSearch;

  const handleToggleCategory = useCallback(
    (category: string) => {
      const updated = selected.includes(category)
        ? selected.filter((c) => c !== category)
        : [...selected, category];
      setInternalSelected(updated);
      onCategoriesChange?.(updated);
    },
    [selected, onCategoriesChange],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setInternalSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  return (
    <div className={`flex flex-col gap-4 ${className}`} {...props}>
      <input
        type="text"
        className="input input-bordered w-full"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label={searchPlaceholder}
      />
      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <label key={category} className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={selected.includes(category)}
              onChange={() => handleToggleCategory(category)}
            />
            <span className="label-text">{category}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => {
          onCategoriesChange?.(selected);
          onSearchChange?.(search);
        }}
      >
        {filterLabel}
      </button>
    </div>
  );
}
