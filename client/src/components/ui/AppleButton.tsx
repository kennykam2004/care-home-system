import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AppleButtonPrimaryProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function AppleButtonPrimary({
  children,
  onClick,
  icon: Icon,
  disabled = false,
  className = '',
  type = 'button',
}: AppleButtonPrimaryProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

interface AppleButtonSecondaryProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function AppleButtonSecondary({
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}: AppleButtonSecondaryProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-white border border-gray-200/80 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}
