import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Table } from './Table';

interface SampleRow {
  id: number;
  name: string;
  category: string;
  date: string;
}

const meta = {
  title: 'Components/Table',
  component: Table<SampleRow>,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof Table<SampleRow>>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleData: SampleRow[] = [
  { id: 1, name: 'Balade du dimanche', category: 'Balade', date: '2026-04-05' },
  { id: 2, name: 'Formation mécanique', category: 'Formation', date: '2026-04-12' },
  { id: 3, name: 'Projection film', category: 'Projection', date: '2026-04-19' },
];

export const Default: Story = {
  args: {
    columns: [
      { header: 'Date', accessor: 'date' },
      { header: 'Nom', accessor: 'name' },
      { header: 'Catégorie', accessor: 'category' },
    ],
    data: sampleData,
    rowKey: (row) => row.id,
  },
};

export const WithActions: Story = {
  args: {
    columns: [
      { header: 'Nom', accessor: 'name' },
      { header: 'Actions', accessor: () => <button className="btn btn-sm btn-primary">Détails</button> },
    ],
    data: sampleData,
    rowKey: (row) => row.id,
  },
};

export const Empty: Story = {
  args: {
    columns: [
      { header: 'Date', accessor: 'date' },
      { header: 'Nom', accessor: 'name' },
    ],
    data: [],
    rowKey: (_row, i) => i,
    emptyMessage: 'Aucune activité trouvée',
  },
};
