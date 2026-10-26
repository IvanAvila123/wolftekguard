import type { CSSProperties } from 'react';

type SegmentedProps<T extends string> = {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    style?: CSSProperties;
};

/** Joined toggle buttons where exactly one option is active (Con costo / Sin costo, prioridad). */
export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
    return (
        <div className="seg" role="group" style={style}>
            {options.map((option) => {
                const on = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        className="seg-opt"
                        aria-pressed={on}
                        onClick={() => onChange(option.value)}
                        style={{
                            border: 0,
                            cursor: 'pointer',
                            font: 'inherit',
                            fontSize: 12,
                            background: on ? 'var(--color-accent-900)' : 'transparent',
                            color: on ? 'var(--color-accent-100)' : 'var(--color-neutral-300)',
                        }}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
