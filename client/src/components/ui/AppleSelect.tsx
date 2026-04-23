import React from 'react';
import { ChevronDown } from 'lucide-react';

interface AppleSelectProps {
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue?: string;
  className?: string;
  disabled?: boolean;
}

export function AppleSelect({
  options,
  value,
  onChange,
  defaultValue,
  className = '',
  disabled = false,
}: AppleSelectProps) {
  const selectProps = value !== undefined ? { value, onChange } : { defaultValue };

  return (
    <div className={`relative ${className}`}>
      <select
        disabled={disabled}
        className="border border-gray-200 bg-gray-50/50 p-1.5 px-3 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-gray-800 appearance-none w-full pr-8"
        {...selectProps}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
}
