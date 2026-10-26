import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section' | 'aside' | 'article';
    elevation?: 'none' | 'md' | 'lg';
};

/** Surface-filled container. */
export function Card({ as: Tag = 'div', elevation = 'none', className, ...props }: CardProps) {
    return <Tag className={cn('card', elevation !== 'none' && `elev-${elevation}`, className)} {...props} />;
}

/** A whole card that is clickable (KPI tiles, sale cards, machote list items). */
export function CardButton({ className, type = 'button', style, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type={type}
            className={cn('card h-bg', className)}
            style={{ border: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left', ...style }}
            {...props}
        />
    );
}
