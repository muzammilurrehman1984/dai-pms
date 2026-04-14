import { useState, useCallback } from 'react';

export const PAGE_SIZES = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 0] as const;
export type PageSize = typeof PAGE_SIZES[number];

export function usePagination(defaultSize: PageSize = 50) {
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(defaultSize);

  const handlePageSize = useCallback((val: PageSize) => {
    setPageSize(val);
    setPage(0);
  }, []);

  const reset = useCallback(() => setPage(0), []);

  function paginate<T>(items: T[]) {
    if (pageSize === 0) return items;
    return items.slice(page * pageSize, (page + 1) * pageSize);
  }

  function totalPages(total: number) {
    return pageSize === 0 ? 1 : Math.ceil(total / pageSize);
  }

  return { page, setPage, pageSize, handlePageSize, reset, paginate, totalPages };
}
