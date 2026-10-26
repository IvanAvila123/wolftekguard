import { useEffect, type ReactNode } from 'react';
import { Button } from './button';
import { Card } from './card';

type DrawerProps = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    /** Small line above the title. */
    eyebrow?: ReactNode;
    width?: string;
    children: ReactNode;
};

/** Right-side panel over a dimmed backdrop; closes on backdrop click and Escape. */
export function Drawer({ open, onClose, title, eyebrow, width = 'min(440px, 100%)', children }: DrawerProps) {
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
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 20 }} />
            <Card
                as="aside"
                elevation="lg"
                role="dialog"
                aria-modal="true"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width,
                    zIndex: 21,
                    borderRadius: 0,
                    gap: 'var(--space-6)',
                    padding: 'var(--space-8)',
                    overflowY: 'auto',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {eyebrow && <span style={{ fontSize: 12, color: 'var(--color-neutral-300)' }}>{eyebrow}</span>}
                        <span style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.4 }}>{title}</span>
                    </div>
                    <Button variant="ghost" iconOnly icon="x" onClick={onClose} aria-label="Cerrar" />
                </div>
                {children}
            </Card>
        </>
    );
}
