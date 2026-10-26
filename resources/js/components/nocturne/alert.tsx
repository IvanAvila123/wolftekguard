import type { ReactNode } from 'react';
import { Icon } from './icon';

type AlertProps = {
    variant?: 'error' | 'info';
    children: ReactNode;
};

/** Inline message box: accent-tinted for errors, neutral with an envelope for info. */
export function Alert({ variant = 'error', children }: AlertProps) {
    const isError = variant === 'error';

    return (
        <div
            role={isError ? 'alert' : 'status'}
            style={{
                display: 'flex',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: isError ? 'var(--color-accent-900)' : 'var(--color-neutral-800)',
                boxShadow: isError ? 'inset 0 0 0 1px var(--color-accent-700)' : 'none',
                color: isError ? 'var(--color-accent-100)' : 'var(--color-neutral-100)',
                fontSize: 12,
                lineHeight: 1.5,
            }}
        >
            <Icon
                name={isError ? 'warning-circle' : 'envelope-simple'}
                size={16}
                color={isError ? undefined : 'var(--color-accent)'}
                style={{ flex: 'none' }}
            />
            <span>{children}</span>
        </div>
    );
}
