export type MachoteLine = { parts: { t: string; bg: string; color: string; pad: string }[] };

/** A machote rendered line by line in monospace, with its {VARIABLES} highlighted or filled in. */
export function MachoteLines({ lines }: { lines: MachoteLine[] }) {
    return (
        <div
            style={{
                padding: 'var(--space-6)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg)',
                boxShadow: 'var(--shadow-sm)',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 12,
                lineHeight: 1.7,
            }}
        >
            {lines.map((line, i) => (
                <div key={i} style={{ minHeight: '1.7em' }}>
                    {line.parts.map((part, j) => (
                        <span key={j} style={{ background: part.bg, color: part.color, padding: part.pad, borderRadius: 4 }}>
                            {part.t}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}
