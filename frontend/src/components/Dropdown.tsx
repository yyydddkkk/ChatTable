import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: number | string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  label?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = '请选择',
  label,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-2 block text-sm font-medium text-[--color-text]">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="pluto-dropdown-button flex h-11 w-full items-center justify-between rounded-2xl px-4 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-[--color-primary]/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-[--color-text]' : 'text-[--color-text-subtle]'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-[--color-text-subtle] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="pluto-dropdown-panel absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-[24px] p-2"
          role="listbox"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                data-active={active ? 'true' : 'false'}
                className="pluto-dropdown-option flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition"
                role="option"
                aria-selected={active}
              >
                <span>{option.label}</span>
                {active && <Check size={15} className="text-[--color-primary]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
