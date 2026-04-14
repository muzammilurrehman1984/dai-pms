/* eslint-disable @typescript-eslint/no-explicit-any */

interface Column<T = any> {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

export function Table<T = any>({
  columns, data, keyExtractor, loading = false,
  emptyMessage = 'No records found', emptyIcon, onRowClick, rowClassName,
}: TableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="h-4 bg-surface-border rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-12 text-ink-muted gap-2">
                  {emptyIcon && <div className="opacity-30 mb-1">{emptyIcon}</div>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render
                      ? col.render((row as any)[col.key], row)
                      : String((row as any)[col.key] ?? '')}
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

export default Table;
