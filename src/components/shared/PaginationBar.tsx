import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '../../hooks/usePagination';

interface Props {
  page: number;
  pageSize: PageSize;
  total: number;           // filtered total
  totalPages: number;
  onPage: (p: number) => void;
  onPageSize: (s: PageSize) => void;
  /** If true, renders the search slot on the left (pass children as search input) */
  searchSlot?: React.ReactNode;
}

export function PaginationBar({ page, pageSize, total, totalPages, onPage, onPageSize, searchSlot }: Props) {
  const from = total === 0 ? 0 : pageSize === 0 ? 1 : page * pageSize + 1;
  const to   = pageSize === 0 ? total : Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Left: search slot or spacer */}
      {searchSlot ?? <div className="flex-1 min-w-[180px] max-w-xs" />}

      {/* Middle: pagination controls */}
      {pageSize !== 0 && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-ink-muted mr-1">{from}–{to} of {total}</span>
          <button type="button" className="btn btn-outline py-1 px-3 text-xs"
            disabled={page === 0} onClick={() => onPage(page - 1)}>
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="px-2 font-medium text-ink text-xs">{page + 1} / {totalPages}</span>
          <button type="button" className="btn btn-outline py-1 px-3 text-xs"
            disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Right: page size selector */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-ink-muted">Show</span>
        <select className="form-input w-auto text-sm" value={pageSize}
          onChange={e => onPageSize(Number(e.target.value) as PageSize)}>
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s === 0 ? 'All' : s}</option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">per page</span>
      </div>
    </div>
  );
}
