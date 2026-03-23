import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  widthClassName?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  widthClassName = 'w-full',
}: SearchFieldProps) {
  return (
    <label className={`pluto-search-form form ${widthClassName}`}>
      <button type="button" aria-label="搜索">
        <Search size={17} />
      </button>
      <input
        type="text"
        className="pluto-search-input input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className={`reset ${value ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => onChange('')}
        aria-label="清除搜索"
      >
        <X size={15} />
      </button>
    </label>
  );
}
