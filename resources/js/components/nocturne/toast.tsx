import { Card } from './card';
import { Icon } from './icon';

type ToastProps = {
    message: string | null;
    kind?: 'ok' | 'error';
    /** Phones: full-width above the bottom tab bar. */
    mobile?: boolean;
};

/** Transient confirmation in the bottom-right corner. */
export function Toast({ message, kind = 'ok', mobile = false }: ToastProps) {
    if (!message) {
        return null;
    }

    return (
        <Card
            elevation="md"
            role="status"
            style={{
                position: 'fixed',
                left: mobile ? 'var(--space-4)' : 'auto',
                right: mobile ? 'var(--space-4)' : 'var(--space-8)',
                bottom: mobile ? 84 : 'var(--space-8)',
                zIndex: 40,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4) var(--space-6)',
                fontSize: 13,
            }}
        >
            <Icon name={kind === 'error' ? 'warning-circle' : 'check-circle'} size={18} color="var(--color-accent)" />
            {message}
        </Card>
    );
}
