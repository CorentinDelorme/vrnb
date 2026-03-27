import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table } from './Table';

interface TestRow {
  id: number;
  name: string;
  value: number;
}

const columns = [
  { header: 'Name', accessor: 'name' as const },
  { header: 'Value', accessor: 'value' as const },
];

const data: TestRow[] = [
  { id: 1, name: 'Alpha', value: 10 },
  { id: 2, name: 'Beta', value: 20 },
];

describe('Table', () => {
  it('should render column headers', () => {
    render(<Table columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
  });

  it('should render data rows', () => {
    render(<Table columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
  });

  it('should display empty message when no data', () => {
    render(<Table columns={columns} data={[]} rowKey={(_, i) => i} emptyMessage="No items" />);
    expect(screen.getByText('No items')).toBeDefined();
  });

  it('should display default empty message', () => {
    render(<Table columns={columns} data={[]} rowKey={(_, i) => i} />);
    expect(screen.getByText('No data available')).toBeDefined();
  });

  it('should support function accessor', () => {
    const customColumns = [
      { header: 'Display', accessor: (row: TestRow) => `${row.name}: ${row.value}` },
    ];
    render(<Table columns={customColumns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alpha: 10')).toBeDefined();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Table columns={columns} data={data} rowKey={(r) => r.id} className="my-table" />,
    );
    expect(container.firstElementChild?.className).toContain('my-table');
  });
});
