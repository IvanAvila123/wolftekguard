type SwitchProps = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
};

/** On/off toggle with an optional trailing label. */
export function Switch({ checked, onChange, label }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            style={{
                border: 0,
                background: 'transparent',
                font: 'inherit',
                color: 'var(--color-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) 0',
                fontSize: 13,
            }}
        >
            <span
                style={{
                    width: 34,
                    height: 20,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    justifyContent: checked ? 'flex-end' : 'flex-start',
                    background: checked ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
                    boxShadow: 'inset 0 0 0 1px var(--color-neutral-600)',
                }}
            >
                <span
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: checked ? 'var(--color-accent-200)' : 'var(--color-neutral-400)',
                    }}
                />
            </span>
            {label}
        </button>
    );
}
