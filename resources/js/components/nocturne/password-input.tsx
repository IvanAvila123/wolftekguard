import { useState, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { Input } from './field';
import { Icon } from './icon';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    invalid?: boolean;
    ref?: Ref<HTMLInputElement>;
    /** Controlled show/hide, so a confirmation field can follow the main one. */
    visible?: boolean;
    onToggleVisible?: () => void;
};

/** Password field with a show/hide eye and a Caps Lock warning. */
export function PasswordInput({ invalid, visible, onToggleVisible, onKeyUp, style, ...props }: PasswordInputProps) {
    const [ownVisible, setOwnVisible] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const shown = visible ?? ownVisible;
    const toggle = onToggleVisible ?? (() => setOwnVisible((v) => !v));

    const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
        setCapsOn(e.getModifierState('CapsLock'));
        onKeyUp?.(e);
    };

    return (
        <>
            <div style={{ position: 'relative' }}>
                <Input
                    type={shown ? 'text' : 'password'}
                    invalid={invalid}
                    onKeyUp={handleKeyUp}
                    style={{ width: '100%', minHeight: 40, paddingRight: 44, ...style }}
                    {...props}
                />
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={shown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="h-text"
                    style={{
                        position: 'absolute',
                        right: 2,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 40,
                        height: 36,
                        border: 0,
                        background: 'transparent',
                        color: 'var(--color-neutral-300)',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                    }}
                >
                    <Icon name={shown ? 'eye-slash' : 'eye'} />
                </button>
            </div>
            {capsOn && (
                <span style={{ fontSize: 11, color: 'var(--color-accent-200)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Icon name="arrow-fat-up" />
                    Bloq Mayús está activado
                </span>
            )}
        </>
    );
}
