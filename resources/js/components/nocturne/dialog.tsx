import { useEffect, type ReactNode } from 'react';
import { Icon } from './icon';

type DialogProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    /** Phosphor icon shown before the title. */
    icon?: string;
    width?: string;
    actions?: ReactNode;
    children: ReactNode;
};

/** Modal at the top elevation; closes on backdrop click and Escape. */
export function Dialog({ open, onClose, title, icon, width = 'min(460px, 92%)', actions, children }: DialogProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className="dialog-backdrop" onClick={onClose} style={{ zIndex: 30 }}>
            <div
                className="dialog"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{ width, maxHeight: '100%', overflowY: 'auto', gap: 'var(--space-6)' }}
            >
                <div className="dialog-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {icon && <Icon name={icon} size={20} color="var(--color-accent)" />}
                    {title}
                </div>
                <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {children}
                </div>
                {actions && (
                    <div className="dialog-actions" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
