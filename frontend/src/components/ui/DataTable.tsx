import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  selectedRow?: T | null;
  rowKey: (row: T) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  onRowClick,
  loading,
  emptyMessage = 'No data found',
  selectedRow,
  rowKey,
}: DataTableProps<T>) {
  if (loading) return <LoadingSpinner message="Loading data..." />;

  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-8 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-wow-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold text-wow-gold uppercase tracking-wider',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedRow && rowKey(selectedRow) === key;
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-wow-border/50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  isSelected ? 'bg-wow-bg-light' : 'hover:bg-wow-bg-dark'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3', col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
