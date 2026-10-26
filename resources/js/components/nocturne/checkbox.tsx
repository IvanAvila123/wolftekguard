import { Icon } from './icon';

type CheckboxProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
};

/** Square check with a trailing label. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={{
                alignSelf: 'flex-start',
                border: 0,
                background: 'transparent',
                padding: 0,
                font: 'inherit',
                fontSize: 13,
                color: 'var(--color-neutral-200)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
            }}
        >
            <span
                style={{
                    width: 18,
                    height: 18,
                    borderRadius: 'var(--radius-sm)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 12,
                    background: checked ? 'var(--color-accent-800)' : 'transparent',
                    boxShadow: `inset 0 0 0 1px ${checked ? 'var(--color-accent)' : 'var(--color-neutral-500)'}`,
                    color: 'var(--color-accent-100)',
                }}
            >
                {checked && <Icon name="check" weight="bold" />}
            </span>
            {label}
        </button>
    );
}
