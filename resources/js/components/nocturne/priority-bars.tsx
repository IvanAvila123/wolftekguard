import { priorityBars } from '@/wolftek/utils';
import type { ReactNode } from 'react';

type PriorityBarsProps = {
    /** Baja | Media | Alta | Urgente */
    prioridad: string;
    /** Rendered after the bars (usually the priority name). */
    label?: ReactNode;
};

/** Four rising bars filled up to the priority level; Urgente lights them in the accent. */
export function PriorityBars({ prioridad, label }: PriorityBarsProps) {
    return (
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                {priorityBars(prioridad).map((bar, i) => (
                    <span key={i} style={{ width: 3, borderRadius: 1, height: bar.h, background: bar.bg }} />
                ))}
            </span>
            {label}
        </span>
    );
}
