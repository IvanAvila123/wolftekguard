import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './icon';

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    icon?: string;
    /** Count shown dimmed after the label. */
    count?: number;
};

/** Rounded filter pill (status filters, OEM filters). */
export function Chip({ active = false, icon, count, className, type = 'button', style, children, ...props }: ChipProps) {
    return (
        <button
            type={type}
            aria-pressed={active}
            className={cn('h-chip', className)}
            style={{
                border: 0,
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 999,
                flex: 'none',
                whiteSpace: 'nowrap',
                background: active ? 'var(--color-accent-900)' : 'var(--color-neutral-800)',
                color: active ? 'var(--color-accent-100)' : 'var(--color-neutral-200)',
                boxShadow: active ? 'inset 0 0 0 1px var(--color-accent-600)' : 'none',
                ...style,
            }}
            {...props}
        >
            {icon && <Icon name={icon} />}
            {children}
            {count !== undefined && <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
        </button>
    );
}
