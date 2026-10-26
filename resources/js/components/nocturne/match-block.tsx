import { Button } from './button';
import { Icon } from './icon';

type MatchBlockProps = {
    text: string;
    onCopy: () => void;
    onDownload: () => void;
    /** Drawer variant: smaller heading, shorter box, short button labels. */
    compact?: boolean;
};

/** The generated AT&T MATCH text with copy / download actions. */
export function MatchBlock({ text, onCopy, onDownload, compact = false }: MatchBlockProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
            {!compact && <span style={{ fontSize: 18, fontWeight: 500 }}>MATCH AT&amp;T</span>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: compact ? 'var(--space-2)' : 'var(--space-3)',
                        fontSize: compact ? 13 : 14,
                        fontWeight: compact ? 500 : 400,
                    }}
                >
                    <Icon name="file-text" size={compact ? 16 : 17} color="var(--color-accent)" />
                    {compact ? 'MATCH AT&T' : 'MATCH generado'}
                </span>
                <div style={{ display: 'flex', gap: compact ? 'var(--space-2)' : 'var(--space-3)', flexWrap: 'wrap' }}>
                    <Button variant="primary" icon="copy" onClick={onCopy} style={{ whiteSpace: 'nowrap', flex: 'none' }}>
                        {compact ? 'Copiar' : 'Copiar MATCH'}
                    </Button>
                    <Button variant="secondary" icon="download-simple" onClick={onDownload} style={{ whiteSpace: 'nowrap', flex: 'none' }}>
                        {compact ? 'TXT' : 'Descargar TXT'}
                    </Button>
                </div>
            </div>
            <pre
                style={{
                    margin: 0,
                    maxHeight: compact ? 240 : 400,
                    overflow: 'auto',
                    padding: compact ? 'var(--space-4)' : 'var(--space-6)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg)',
                    boxShadow: 'var(--shadow-sm)',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: compact ? 11 : 12,
                    lineHeight: compact ? 1.6 : 1.7,
                    color: 'var(--color-neutral-100)',
                    whiteSpace: 'pre',
                }}
            >
                {text}
            </pre>
        </div>
    );
}
