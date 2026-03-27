import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { CategoryFilter } from './CategoryFilter';

const defaultCategories = [
  'Balade du dimanche',
  'Escapade',
  'Formations',
  'Film documentaire',
  'Éco-citoyenneté',
  'Longe-côte',
  'Réunion',
  'Autres',
];

const meta = {
  title: 'Components/CategoryFilter',
  component: CategoryFilter,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    categories: defaultCategories,
    onCategoriesChange: fn(),
    onSearchChange: fn(),
  },
} satisfies Meta<typeof CategoryFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithSelectedCategories: Story = {
  args: {
    selectedCategories: ['Formations', 'Escapade'],
  },
};

export const WithSearch: Story = {
  args: {
    searchText: 'balade',
  },
};

export const CustomLabels: Story = {
  args: {
    filterLabel: 'Apply Filters',
    searchPlaceholder: 'Search activities...',
  },
};
