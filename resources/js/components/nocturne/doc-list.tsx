import type { ChangeEvent } from 'react';
import { Button } from './button';
import { Icon } from './icon';

export type DocItem = {
    key: string;
    label: string;
    /** File name + size + date, or "Falta". */
    sub: string;
    has: boolean;
    /** Phosphor icon name for a missing document. */
    icon: string;
    onFile: (e: ChangeEvent<HTMLInputElement>) => void;
    view: () => void;
    remove: () => void;
};

export type ExtraFile = { key: string; name: string; sub: string; view: () => void; remove: () => void };

type DocListProps = {
    docs: DocItem[];
    extras: ExtraFile[];
    onAddExtras: (e: ChangeEvent<HTMLInputElement>) => void;
};

function UploadButton({
    label,
    variant,
    multiple,
    accept,
    onChange,
}: {
    label: string;
    variant: 'secondary' | 'ghost';
    multiple?: boolean;
    accept?: string;
    onChange: DocListProps['onAddExtras'];
}) {
    return (
        <label className={`btn btn-${variant}`} style={{ whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none' }}>
            <Icon name={multiple ? 'paperclip' : 'upload-simple'} /> {label}
            <input type="file" multiple={multiple} accept={accept} onChange={onChange} style={{ display: 'none' }} />
        </label>
    );
}

function FileActions({ view, remove }: { view: () => void; remove: () => void }) {
    return (
        <>
            <Button variant="ghost" iconOnly icon="eye" onClick={view} aria-label="Ver" />
            <Button variant="ghost" iconOnly icon="trash" onClick={remove} aria-label="Quitar" />
        </>
    );
}

/** Expediente: one row per required document, then optional extra attachments. */
export function DocList({ docs, extras, onAddExtras }: DocListProps) {
    return (
        <>
            {docs.map((doc) => (
                <div
                    key={doc.key}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-neutral-900)',
                        boxShadow: doc.has ? 'none' : 'inset 0 0 0 1px var(--color-neutral-700)',
                    }}
                >
                    <Icon
                        name={doc.has ? 'check-circle' : doc.icon}
                        weight={doc.has ? 'fill' : 'regular'}
                        size={18}
                        color={doc.has ? 'var(--color-accent)' : 'var(--color-neutral-400)'}
                        style={{ flex: 'none' }}
                    />
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{doc.label}</span>
                        <span
                            style={{
                                fontSize: 11,
                                lineHeight: 1.4,
                                color: doc.has ? 'var(--color-neutral-300)' : 'var(--color-accent-200)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {doc.sub}
                        </span>
                    </span>
                    {doc.has && <FileActions view={doc.view} remove={doc.remove} />}
                    <UploadButton label={doc.has ? 'Cambiar' : 'Subir'} variant="secondary" accept="image/*,.pdf" onChange={doc.onFile} />
                </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-neutral-200)' }}>
                        Otros archivos <span style={{ color: 'var(--color-neutral-400)' }}>· opcional</span>
                    </span>
                    <UploadButton label="Agregar archivos" variant="ghost" multiple onChange={onAddExtras} />
                </div>
                {extras.map((file) => (
                    <div
                        key={file.key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-neutral-900)',
                        }}
                    >
                        <Icon name="file" size={16} color="var(--color-neutral-300)" style={{ flex: 'none' }} />
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 12, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                            </span>
                            <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--color-neutral-400)' }}>{file.sub}</span>
                        </span>
                        <FileActions view={file.view} remove={file.remove} />
                    </div>
                ))}
                {extras.length === 0 && (
                    <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--color-neutral-400)' }}>
                        Fotos, correos o cualquier archivo de respaldo.
                    </span>
                )}
            </div>
        </>
    );
}
