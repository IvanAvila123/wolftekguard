import { Button } from './button';

type MonthSwitcherProps = {
    label: string;
    onPrev: () => void;
    onNext: () => void;
    nextDisabled?: boolean;
};

/** ‹ Octubre 2026 › */
export function MonthSwitcher({ label, onPrev, onNext, nextDisabled = false }: MonthSwitcherProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button variant="ghost" iconOnly icon="caret-left" onClick={onPrev} aria-label="Mes anterior" />
            <span style={{ fontSize: 14, fontWeight: 500, minWidth: 120, textAlign: 'center' }}>{label}</span>
            <Button variant="ghost" iconOnly icon="caret-right" onClick={onNext} disabled={nextDisabled} aria-label="Mes siguiente" />
        </div>
    );
}
