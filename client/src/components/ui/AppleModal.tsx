import React from 'react';
import { X } from 'lucide-react';
import { AppleButtonPrimary, AppleButtonSecondary } from './AppleButton';

interface AppleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AppleModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: AppleModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-[350px]',
    md: 'w-[600px]',
    lg: 'w-[850px]',
    xl: 'w-[950px]',
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden border border-white/40`}
      >
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50 backdrop-blur-md">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-200/50 hover:text-gray-700 p-2 rounded-full transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

AppleModal.Footer = function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = '取消',
  confirmText = '確認',
  confirmDisabled = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
}) {
  return (
    <>
      <AppleButtonSecondary onClick={onCancel}>{cancelText}</AppleButtonSecondary>
      <AppleButtonPrimary onClick={onConfirm} disabled={confirmDisabled}>
        {confirmText}
      </AppleButtonPrimary>
    </>
  );
};
