import React from 'react';

interface AppleInputProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function AppleInput({
  label,
  placeholder,
  defaultValue,
  value,
  onChange,
  onKeyDown,
  type = 'text',
  disabled = false,
  required = false,
  className = '',
}: AppleInputProps) {
  const inputProps = value !== undefined ? { value, onChange } : { defaultValue, onChange };

  return (
    <div className={`flex items-center border border-gray-200 bg-gray-50/50 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm ${className}`}>
      {label && (
        <span className="text-sm text-gray-500 bg-gray-100/50 px-3 py-1.5 border-r border-gray-200/50 whitespace-nowrap shrink-0">
          {label}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onKeyDown={onKeyDown}
        className="p-1.5 px-3 outline-none text-sm w-full bg-transparent text-gray-800 placeholder-gray-400 disabled:text-gray-400"
        {...inputProps}
      />
    </div>
  );
}
