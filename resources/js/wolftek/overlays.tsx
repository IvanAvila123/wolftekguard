import {
    Button,
    CardButton,
    Dialog,
    DocList,
    Drawer,
    Icon,
    iconName,
    MatchBlock,
    Select,
    Tag,
    Textarea,
    Toast,
    type TagVariant,
} from '@/components/nocturne';
import type { ReactNode } from 'react';
import { ImportDialog } from './import-dialog';
import type { WolftekView } from './use-wolftek';
import { sx } from './utils';

const tagVariant = (tagClass: string) => tagClass.replace('tag tag-', '') as TagVariant;

function SectionLabel({ icon, children }: { icon: string; children: ReactNode }) {
    return (
        <span style={sx('display:flex;align-items:center;gap:var(--space-2);font-size:13px;font-weight:500;')}>
            <Icon name={icon} size={16} color="var(--color-accent)" />
            {children}
        </span>
    );
}

function SaleDrawer({ v }: { v: WolftekView }) {
    const sel = v.sel;

    return (
        <Drawer open={!!sel} onClose={v.closeSel} eyebrow={sel?.tipoNice} title={sel?.name}>
            {sel && (
                <>
                    <label style={sx('display:flex;flex-direction:column;gap:var(--space-2);')}>
                        <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>Estatus</span>
                        <Select value={sel.status} onChange={v.onSelStatus} options={v.statusList} />
                    </label>

                    {sel.hasNext && (
                        <div
                            style={sx(
                                'display:flex;gap:var(--space-3);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-accent-900);color:var(--color-accent-100);font-size:12px;line-height:1.5;',
                            )}
                        >
                            <Icon name="lightbulb" size={16} style={sx('flex:none;')} />
                            <span>{sel.next}</span>
                        </div>
                    )}

                    <dl
                        style={sx(
                            'display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:var(--space-3) var(--space-6);margin:0;font-size:13px;line-height:1.4;',
                        )}
                    >
                        {sel.details.map((d) => (
                            <div key={d.k} style={sx('display:contents;')}>
                                <dt style={sx('color:var(--color-neutral-300);white-space:nowrap;')}>{d.k}</dt>
                                <dd
                                    style={sx(
                                        'margin:0;font-variant-numeric:tabular-nums;display:flex;align-items:flex-start;gap:var(--space-2);line-height:1.4;min-width:0;',
                                    )}
                                >
                                    {d.v}
                                    {d.copy && (
                                        <button
                                            type="button"
                                            onClick={d.doCopy}
                                            aria-label={'Copiar ' + d.k}
                                            className="h-acc"
                                            style={sx(
                                                'border:0;background:transparent;padding:0;cursor:pointer;color:var(--color-neutral-400);display:flex;',
                                            )}
                                        >
                                            <Icon name="copy" />
                                        </button>
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <MatchBlock compact text={v.selMatchText} onCopy={v.copySelMatch} onDownload={v.dlSelMatch} />

                    <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;')}>
                            <SectionLabel icon="file-csv">Archivos CSV</SectionLabel>
                            <Button icon="download-simple" onClick={v.dlSelAllCsv} style={sx('white-space:nowrap;flex:none;')}>
                                Descargar todos
                            </Button>
                        </div>
                        <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-2);')}>
                            {v.selCsvFiles.map((cf) => (
                                <button
                                    key={cf.file}
                                    type="button"
                                    onClick={cf.dl}
                                    disabled={cf.disabled}
                                    title={cf.file}
                                    className="h-ring h-acc1"
                                    style={sx(
                                        `border:0;font:inherit;cursor:pointer;display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);border-radius:999px;font-size:12px;white-space:nowrap;background:var(--color-neutral-800);color:var(--color-neutral-100);box-shadow:inset 0 0 0 1px var(--color-neutral-700);opacity:${cf.opacity};`,
                                    )}
                                >
                                    <Icon name="download-simple" />
                                    {cf.label}
                                    <span style={sx('color:var(--color-neutral-400);font-variant-numeric:tabular-nums;')}>{cf.n}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                        <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);')}>
                            <SectionLabel icon="folder-simple">Expediente</SectionLabel>
                            <Tag variant={tagVariant(v.selDocTag)}>{v.selDocCount}</Tag>
                        </div>
                        {v.selDocMissing && (
                            <span style={sx('font-size:12px;line-height:1.5;color:var(--color-accent-200);display:flex;gap:var(--space-2);')}>
                                <Icon name="warning" style={sx('margin-top:2px;flex:none;')} />
                                {v.selDocMissingMsg}
                            </span>
                        )}
                        <DocList
                            docs={v.selDocs.map((dc) => ({ ...dc, icon: iconName(dc.icon) }))}
                            extras={v.selOtros.items}
                            onAddExtras={v.selOtros.add}
                        />
                    </div>

                    <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                        <SectionLabel icon="note">Notas</SectionLabel>
                        {v.selNotes.map((nt, i) => (
                            <div
                                key={i}
                                style={sx(
                                    'display:flex;flex-direction:column;gap:2px;padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);font-size:12px;line-height:1.5;',
                                )}
                            >
                                <span>{nt.t}</span>
                                <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>{nt.at}</span>
                            </div>
                        ))}
                        <Textarea
                            rows={2}
                            value={v.noteDraft}
                            onChange={v.onNoteDraft}
                            placeholder="Ej. El ejecutivo acepta el cambio a iPhone 17 Blanco"
                            style={sx('resize:vertical;font:inherit;font-size:13px;min-height:0;')}
                        />
                        <Button
                            icon="plus"
                            onClick={v.addNote}
                            disabled={!v.noteDraft.trim()}
                            style={sx('align-self:flex-start;white-space:nowrap;')}
                        >
                            Agregar nota
                        </Button>
                    </div>

                    <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                        <span style={sx('font-size:13px;font-weight:500;')}>Historial</span>
                        {sel.log.map((l, i) => (
                            <div key={i} style={sx('display:grid;grid-template-columns:10px 1fr;gap:var(--space-4);font-size:12px;')}>
                                <span style={sx('width:7px;height:7px;margin-top:5px;border-radius:50%;background:var(--color-accent);')}></span>
                                <div style={sx('display:flex;flex-direction:column;gap:2px;')}>
                                    <span>{l.t}</span>
                                    <span style={sx('color:var(--color-neutral-400);')}>{l.at}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={sx('display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:auto;')}>
                        <Button variant="primary" icon="pencil-simple" onClick={v.editSale} style={sx('white-space:nowrap;')}>
                            Editar venta
                        </Button>
                        <Button icon="copy-simple" onClick={v.dupSale}>
                            Duplicar venta
                        </Button>
                        <Button icon="clipboard-text" onClick={v.copySaleMach}>
                            Copiar mensaje
                        </Button>
                        <Button variant="ghost" icon="archive" onClick={v.askArchive}>
                            Archivar
                        </Button>
                    </div>
                </>
            )}
        </Drawer>
    );
}

function MachoteDialog({ v }: { v: WolftekView }) {
    return (
        <Dialog
            open={v.mDialog}
            onClose={v.closeMachDialog}
            title="Usar un machote"
            actions={
                <Button variant="ghost" onClick={v.closeMachDialog}>
                    Cancelar
                </Button>
            }
        >
            <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                Llena el estatus, la prioridad y las notas con los valores de la plantilla.
            </span>
            {v.machList.map((m) => (
                <CardButton
                    key={m.key}
                    onClick={m.apply}
                    className="h-ring"
                    style={sx(
                        'flex-direction:row;justify-content:space-between;align-items:center;gap:var(--space-4);padding:var(--space-4) var(--space-6);',
                    )}
                >
                    <span style={sx('display:flex;flex-direction:column;gap:2px;')}>
                        <span style={sx('font-size:13px;font-weight:500;')}>{m.name}</span>
                        <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{m.cat}</span>
                    </span>
                    <Icon name="caret-right" />
                </CardButton>
            ))}
        </Dialog>
    );
}

function StockDialog({ v }: { v: WolftekView }) {
    return (
        <Dialog
            open={v.stockModal}
            onClose={v.closeStock}
            title={v.stockTitle}
            icon={iconName(v.stockTitleIcon)}
            width="min(560px, 100%)"
            actions={
                <>
                    <Button variant="ghost" onClick={v.closeStock}>
                        Volver a la venta
                    </Button>
                    <Button variant="primary" icon="check" onClick={v.saveAnyway}>
                        {v.saveAnywayLabel}
                    </Button>
                </>
            }
        >
            <span style={sx('font-size:13px;line-height:1.5;color:var(--color-neutral-200);')}>{v.stockIntro}</span>
            {v.shortages.map((sh) => (
                <div
                    key={sh.key}
                    style={sx(
                        'display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);box-shadow:inset 0 0 0 1px var(--color-neutral-800);',
                    )}
                >
                    <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);')}>
                        <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                            <span style={sx('font-size:13px;line-height:1.4;')}>{sh.name}</span>
                            <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>
                                {sh.sku} · {sh.bots} · {sh.needSub}
                            </span>
                        </span>
                        <Tag variant="accent">{sh.need}</Tag>
                    </div>
                    {sh.hasAlts ? (
                        <>
                            <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>Mismo modelo en otro color:</span>
                            <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-2);')}>
                                {sh.alts.map((al) => (
                                    <button
                                        key={al.key}
                                        type="button"
                                        onClick={al.pick}
                                        className="h-ring"
                                        style={sx(
                                            `border:0;font:inherit;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);border-radius:999px;white-space:nowrap;background:${al.bg};color:${al.color};box-shadow:${al.ring};`,
                                        )}
                                    >
                                        <Icon name="swap" />
                                        {al.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <span style={sx('font-size:12px;color:var(--color-neutral-400);')}>No hay otro color de este modelo con piezas.</span>
                    )}
                </div>
            ))}
        </Dialog>
    );
}

function ConflictOption({ title, value, picked, onPick }: { title: string; value: string; picked: boolean; onPick: () => void }) {
    return (
        <button
            type="button"
            aria-pressed={picked}
            onClick={onPick}
            className="h-ring"
            style={sx(
                `border:0;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-4);border-radius:var(--radius-md);min-width:0;color:var(--color-text);background:${picked ? 'var(--color-accent-900)' : 'var(--color-neutral-900)'};box-shadow:inset 0 0 0 1px ${picked ? 'var(--color-accent)' : 'var(--color-neutral-800)'};`,
            )}
        >
            <span style={sx('display:flex;align-items:center;gap:var(--space-2);font-size:11px;color:var(--color-neutral-300);')}>
                <Icon
                    name={picked ? 'check-circle' : 'circle'}
                    weight={picked ? 'fill' : 'regular'}
                    color={picked ? 'var(--color-accent)' : undefined}
                />
                {title}
            </span>
            <span style={sx('font-size:13px;line-height:1.5;white-space:pre-line;overflow-wrap:anywhere;')}>{value || '—'}</span>
        </button>
    );
}

function ConflictDialog({ v }: { v: WolftekView }) {
    return (
        <Dialog
            open={v.conflictOpen}
            onClose={v.closeConflict}
            title="Esta venta cambió mientras la editabas"
            icon="git-merge"
            width="min(640px, 100%)"
            actions={
                <>
                    <Button variant="ghost" onClick={v.closeConflict}>
                        Cancelar
                    </Button>
                    <Button variant="primary" icon="git-merge" onClick={v.applyConflict} disabled={v.conflictLoading}>
                        Combinar y revisar
                    </Button>
                </>
            }
        >
            {v.conflictLoading ? (
                <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')} aria-busy="true">
                    <span style={sx('font-size:13px;color:var(--color-neutral-300);')}>Cargando cómo quedó la venta…</span>
                    {[0, 1].map((i) => (
                        <div
                            key={i}
                            className="pulse"
                            style={sx('height:64px;border-radius:var(--radius-md);background:var(--color-neutral-900);')}
                        />
                    ))}
                </div>
            ) : (
                <>
                    <span style={sx('font-size:13px;line-height:1.5;color:var(--color-neutral-200);')}>
                        {v.conflictSame
                            ? 'Alguien guardó esta venta mientras la editabas, pero quedó igual que tu versión. Puedes combinar y guardar sin perder nada.'
                            : 'Alguien la guardó en otro equipo o sin conexión. Comparamos tu edición con cómo está ahora: lo que solo cambió de un lado se combina solo; lo que cambió de los dos lados lo eliges tú.'}
                    </span>

                    {v.conflictChoices.length > 0 && (
                        <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                            <SectionLabel icon="hand-pointing">Elige qué conservar</SectionLabel>
                            {v.conflictChoices.map((c) => (
                                <div key={c.key} style={sx('display:flex;flex-direction:column;gap:var(--space-2);')}>
                                    <span style={sx('font-size:12px;font-weight:500;')}>{c.label}</span>
                                    <div style={sx(`display:grid;grid-template-columns:${v.isMobile ? '1fr' : '1fr 1fr'};gap:var(--space-3);`)}>
                                        <ConflictOption title="Tu versión" value={c.mine} picked={c.picked === 'mine'} onPick={c.pickMine} />
                                        <ConflictOption
                                            title="Cómo está ahora"
                                            value={c.theirs}
                                            picked={c.picked === 'theirs'}
                                            onPick={c.pickTheirs}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {v.conflictAuto.length > 0 && (
                        <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                            <SectionLabel icon="arrows-merge">Se combinan solos</SectionLabel>
                            {v.conflictAuto.map((c) => (
                                <div
                                    key={c.key}
                                    style={sx(
                                        'display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);',
                                    )}
                                >
                                    <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                        <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{c.label}</span>
                                        <span style={sx('font-size:13px;white-space:pre-line;overflow-wrap:anywhere;')}>{c.value || '—'}</span>
                                    </span>
                                    <Tag variant="neutral">{c.from}</Tag>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </Dialog>
    );
}

function ArchiveDialog({ v }: { v: WolftekView }) {
    return (
        <Dialog
            open={v.archiveAsk}
            onClose={v.cancelArchive}
            title="Archivar venta"
            icon="archive"
            actions={
                <>
                    <Button variant="ghost" onClick={v.cancelArchive}>
                        Cancelar
                    </Button>
                    <Button variant="primary" icon="archive" onClick={v.confirmArchive}>
                        Archivar
                    </Button>
                </>
            }
        >
            <span style={sx('font-size:13px;line-height:1.5;color:var(--color-neutral-200);')}>{v.archiveMsg}</span>
        </Dialog>
    );
}

function ArchivedDialog({ v }: { v: WolftekView }) {
    return (
        <Dialog
            open={v.archivedOpen}
            onClose={v.closeArchived}
            title="Ventas archivadas"
            icon="archive"
            width="min(560px, 100%)"
            actions={
                <Button variant="ghost" onClick={v.closeArchived}>
                    Cerrar
                </Button>
            }
        >
            {v.archivedLoading ? (
                <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')} aria-busy="true">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="pulse"
                            style={sx('height:56px;border-radius:var(--radius-md);background:var(--color-neutral-900);')}
                        />
                    ))}
                </div>
            ) : v.archived.length === 0 ? (
                <span style={sx('font-size:13px;color:var(--color-neutral-300);')}>No hay ventas archivadas.</span>
            ) : (
                <>
                    <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                        Las más recientes primero. Al restaurar una venta vuelve a su mes con todo su historial.
                    </span>
                    {v.archived.map((a) => (
                        <div
                            key={a.key}
                            style={sx(
                                'display:flex;justify-content:space-between;align-items:center;gap:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);box-shadow:inset 0 0 0 1px var(--color-neutral-800);',
                            )}
                        >
                            <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                <span style={sx('font-size:13px;font-weight:500;')}>{a.name}</span>
                                <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>{a.meta}</span>
                                <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>{a.at}</span>
                            </span>
                            <Button icon="arrow-counter-clockwise" onClick={a.restore} style={sx('white-space:nowrap;flex:none;')}>
                                Restaurar
                            </Button>
                        </div>
                    ))}
                </>
            )}
        </Dialog>
    );
}

export default function Overlays({ v }: { v: WolftekView }) {
    return (
        <>
            <SaleDrawer v={v} />
            <MachoteDialog v={v} />
            <StockDialog v={v} />
            <ConflictDialog v={v} />
            <ArchiveDialog v={v} />
            <ArchivedDialog v={v} />
            <ImportDialog open={v.importDialog} online={v.connection.online} onClose={v.closeImport} onImported={v.importDone} />
            <Toast message={v.toast} kind={v.toastIcon.includes('warning') ? 'error' : 'ok'} mobile={v.isMobile} />
        </>
    );
}
