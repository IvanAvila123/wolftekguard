import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';

type IconProps = {
    /** Phosphor icon name without the `ph-` prefix, e.g. `plus`, `caret-right`. */
    name: string;
    weight?: 'regular' | 'bold' | 'fill';
    size?: number;
    color?: string;
    className?: string;
    style?: CSSProperties;
};

/** Turns a Phosphor class string like `ph ph-receipt` or `ph-fill ph-check` into the bare name `receipt`. */
export function iconName(phosphorClass: string): string {
    return phosphorClass.replace(/^ph(-fill)? ph-/, '');
}

/** Phosphor icon (loaded from the CDN in app.blade.php), as used throughout the Nocturne design. */
export function Icon({ name, weight = 'regular', size, color, className, style }: IconProps) {
    return (
        <i
            aria-hidden="true"
            className={cn(weight === 'regular' ? 'ph' : `ph-${weight}`, `ph-${name}`, className)}
            style={{ ...(size ? { fontSize: size } : {}), ...(color ? { color } : {}), ...style }}
        />
    );
}
