import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  const getVisiblePages = () => {
    const visible: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);
    for (let i = start; i <= end; i++) visible.push(i);
    return visible;
  };

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-sm text-gray-500">
        Page {page} of {pages} ({total.toLocaleString()} total)
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-wow-bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        {getVisiblePages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={clsx(
              'px-2.5 py-1 rounded text-sm transition-colors',
              p === page
                ? 'bg-wow-gold text-wow-bg-darkest font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-wow-bg-light'
            )}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-wow-bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
