import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import { Icon } from './icon';

export type TagVariant = 'accent' | 'accent-2' | 'neutral' | 'outline';

type TagProps = HTMLAttributes<HTMLSpanElement> & {
    variant?: TagVariant;
    icon?: string;
};

/** Small tinted label (statuses, stock, counts). */
export function Tag({ variant = 'neutral', icon, className, children, style, ...props }: TagProps) {
    return (
        <span className={cn('tag', `tag-${variant}`, className)} style={{ flex: 'none', whiteSpace: 'nowrap', ...style }} {...props}>
            {icon && <Icon name={icon} />}
            {children}
        </span>
    );
}
