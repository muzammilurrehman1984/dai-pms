import { useState, useEffect } from 'react';
import type { SortField, FilterConfig } from '../../types';

interface SortFilterBarProps<T> {
  fields: SortField<T>[];
  filters: FilterConfig[];
  onSortChange: (field: keyof T, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Record<string, string>) => void;
  storageKey?: string;
}

interface SortState<T> {
  field: keyof T | '';
  direction: 'asc' | 'desc';
}

export function SortFilterBar<T>({
  fields,
  filters,
  onSortChange,
  onFilterChange,
  storageKey,
}: SortFilterBarProps<T>) {
  const [sort, setSort] = useState<SortState<T>>({ field: '', direction: 'asc' });
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Restore from sessionStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { sort: SortState<T>; filters: Record<string, string> };
        setSort(parsed.sort);
        setFilterValues(parsed.filters);
        if (parsed.sort.field) {
          onSortChange(parsed.sort.field as keyof T, parsed.sort.direction);
        }
        if (Object.keys(parsed.filters).length > 0) {
          onFilterChange(parsed.filters);
        }
      }
    } catch {
      // ignore malformed storage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (newSort: SortState<T>, newFilters: Record<string, string>) => {
    if (!storageKey) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ sort: newSort, filters: newFilters }));
  };

  const handleSortFieldChange = (field: string) => {
    const newSort: SortState<T> = { field: field as keyof T, direction: sort.direction };
    setSort(newSort);
    persist(newSort, filterValues);
    if (field) onSortChange(field as keyof T, newSort.direction);
  };

  const handleSortDirectionChange = (direction: 'asc' | 'desc') => {
    const newSort: SortState<T> = { ...sort, direction };
    setSort(newSort);
    persist(newSort, filterValues);
    if (sort.field) onSortChange(sort.field as keyof T, direction);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value };
    if (!value) delete newFilters[key];
    setFilterValues(newFilters);
    persist(sort, newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {fields.length > 0 && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label className="text-sm font-medium text-gray-600">Sort by</label>
          <div className="flex gap-2">
            <select
              value={sort.field as string}
              onChange={(e) => handleSortFieldChange(e.target.value)}
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— none —</option>
              {fields.map((f) => (
                <option key={f.key as string} value={f.key as string}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={sort.direction}
              onChange={(e) => handleSortDirectionChange(e.target.value as 'asc' | 'desc')}
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>
      )}

      {filters.map((filter) => (
        <div key={filter.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label className="text-sm font-medium text-gray-600">{filter.label}</label>
          {filter.options ? (
            <select
              value={filterValues[filter.key] ?? ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={filterValues[filter.key] ?? ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              placeholder={`Filter ${filter.label}`}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}
