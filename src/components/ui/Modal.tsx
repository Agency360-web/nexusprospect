import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate pr-4">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};


export default Modal;
