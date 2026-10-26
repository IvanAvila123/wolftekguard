import { cn } from '@/lib/utils';
import type { CSSProperties, InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from './icon';

type FieldProps = {
    label: ReactNode;
    required?: boolean;
    /** Neutral helper text, shown when there is no error. */
    hint?: string;
    error?: string | null;
    /** Span every column of the parent grid. */
    full?: boolean;
    /** Render as a div instead of a label (when the control is a button or several controls). */
    asDiv?: boolean;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
};

/** Label + control + helper/error text, stacked. */
export function Field({ label, required, hint, error, full, asDiv, className, style, children }: FieldProps) {
    const Wrapper = asDiv ? 'div' : 'label';
    const message = error || hint;

    return (
        <Wrapper
            className={className}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...(full ? { gridColumn: '1 / -1' } : {}), ...style }}
        >
            <span style={{ fontSize: 12, color: 'var(--color-neutral-200)' }}>
                {label}
                {required && <span style={{ color: 'var(--color-accent-300)' }}> *</span>}
            </span>
            {children}
            {message && <span style={{ fontSize: 11, color: error ? 'var(--color-accent-200)' : 'var(--color-neutral-400)' }}>{message}</span>}
        </Wrapper>
    );
}

const invalidRing = 'inset 0 0 0 1px var(--color-accent)';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; ref?: Ref<HTMLInputElement> };

export function Input({ invalid, className, style, ...props }: InputProps) {
    return <input className={cn('input', className)} style={{ ...(invalid ? { boxShadow: invalidRing } : {}), ...style }} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    options: (string | { value: string; label: string })[];
};

export function Select({ options, className, ...props }: SelectProps) {
    return (
        <select className={cn('input', className)} {...props}>
            {options.map((option) => {
                const value = typeof option === 'string' ? option : option.value;
                const label = typeof option === 'string' ? option : option.label;

                return (
                    <option key={value} value={value}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn('input', className)} {...props} />;
}

type SearchInputProps = Omit<InputProps, 'type'>;

/** Text input with a leading magnifying-glass icon. */
export function SearchInput({ style, ...props }: SearchInputProps) {
    return (
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Icon
                name="magnifying-glass"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-neutral-400)' }}
            />
            <Input style={{ width: '100%', paddingLeft: 30, ...style }} {...props} />
        </div>
    );
}
