import type { ReactNode } from 'react';
import { Button } from './button';
import { Icon } from './icon';

type PageHeaderProps = {
    title: ReactNode;
    subtitle?: ReactNode;
    subtitleIcon?: string;
    /** Shows a back arrow before the title. */
    onBack?: () => void;
    /** Leading badge instead of a back arrow (e.g. the "Venta creada" check). */
    leading?: ReactNode;
    /** Right-hand side: buttons or a MonthSwitcher. */
    actions?: ReactNode;
    /** 24px on phones, 28px otherwise. */
    compact?: boolean;
};

/** Screen title row: title + subtitle on the left, actions on the right, wrapping on small screens. */
export function PageHeader({ title, subtitle, subtitleIcon, onBack, leading, actions, compact = false }: PageHeaderProps) {
    const alignTop = !!(onBack || leading);

    return (
        <header
            style={{
                display: 'flex',
                alignItems: alignTop ? 'flex-start' : 'flex-end',
                justifyContent: 'space-between',
                gap: 'var(--space-6)',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                {onBack && <Button variant="ghost" iconOnly icon="arrow-left" onClick={onBack} aria-label="Regresar" />}
                {leading}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <h1 style={{ margin: 0, fontSize: compact ? 24 : 28, fontWeight: 500 }}>{title}</h1>
                    {subtitle && (
                        <span
                            style={{ fontSize: 13, color: 'var(--color-neutral-300)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                            {subtitleIcon && <Icon name={subtitleIcon} />}
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>
            {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>{actions}</div>}
        </header>
    );
}
