import { Search, X } from 'lucide-react';
import clsx from 'clsx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...', className }: SearchInputProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-wow-bg-dark border border-wow-border text-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm focus:border-wow-gold focus:outline-none transition-colors placeholder:text-gray-600"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
