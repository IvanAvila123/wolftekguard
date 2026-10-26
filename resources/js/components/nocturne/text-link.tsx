import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** Accent text link for in-app navigation (e.g. "¿La olvidaste?", "Crear cuenta"). */
export function TextLink({ href, size = 13, children }: { href: string; size?: number; children: ReactNode }) {
    return (
        <Link href={href} className="h-acc" style={{ fontSize: size, color: 'var(--color-accent-300)', textDecoration: 'none' }}>
            {children}
        </Link>
    );
}
