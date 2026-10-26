import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    /** Leading Phosphor icon name. */
    icon?: string;
    /** Trailing Phosphor icon name. */
    iconRight?: string;
    /** Square 36px icon-only button; pass `aria-label`. */
    iconOnly?: boolean;
    block?: boolean;
    /** Swaps the leading icon for a spinner and disables the button. */
    loading?: boolean;
    children?: ReactNode;
};

/** Nocturne button: primary is an accent outline, never a fill. */
export function Button({
    variant = 'secondary',
    icon,
    iconRight,
    iconOnly = false,
    block = false,
    loading = false,
    disabled,
    className,
    type = 'button',
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn('btn', `btn-${variant}`, iconOnly && 'btn-icon', block && 'btn-block', className)}
            {...props}
        >
            {loading ? <Icon name="circle-notch" className="spin" /> : icon && <Icon name={icon} />}
            {children}
            {iconRight && <Icon name={iconRight} />}
        </button>
    );
}
