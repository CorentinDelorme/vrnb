import type { HTMLAttributes, ReactNode } from 'react';

export interface TableColumn<T> {
  /** Column header text */
  header: string;
  /** Key or accessor function to get cell value */
  accessor: keyof T | ((row: T) => ReactNode);
  /** Optional custom className for the column */
  className?: string;
}

export interface TableProps<T> extends HTMLAttributes<HTMLDivElement> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Function to get a unique key for each row */
  rowKey: (row: T, index: number) => string | number;
  /** Message to display when data is empty */
  emptyMessage?: string;
}

/** Table component with configurable columns and dynamic rows */
export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No data available',
  className = '',
  ...props
}: TableProps<T>) {
  function getCellValue(row: T, column: TableColumn<T>): ReactNode {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    return value as ReactNode;
  }

  return (
    <div className={`overflow-x-auto ${className}`} {...props}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-base-content/60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columns.map((col) => (
                  <td key={col.header} className={col.className}>
                    {getCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
