import { Button, Card, CardButton, Dialog, Field, Icon, Input, MachoteLines, PageHeader, Tag, Textarea } from '@/components/nocturne';

import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

export default function MachotesScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title="Machotes"
                subtitle="Plantillas para captura rápida de ventas"
                compact={v.isMobile}
                actions={
                    <Button variant="primary" icon="plus" onClick={v.newMach}>
                        Nuevo machote
                    </Button>
                }
            />

            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--space-6);align-items:start;')}>
                <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                    {v.machList.map((m) => (
                        <CardButton key={m.key} onClick={m.pick} style={sx(`gap:var(--space-2);padding:var(--space-6);box-shadow:${m.ring};`)}>
                            <div style={sx('display:flex;justify-content:space-between;gap:var(--space-4);')}>
                                <span style={sx('font-size:14px;font-weight:500;')}>{m.name}</span>
                                <Tag>{m.cat}</Tag>
                            </div>
                            <span
                                style={sx('font-size:12px;color:var(--color-neutral-300);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}
                            >
                                {m.preview}
                            </span>
                            <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>
                                {m.vars} variables · usado {m.uses} veces
                            </span>
                        </CardButton>
                    ))}
                </div>

                <Card style={sx(`grid-column:${v.machSpan};gap:var(--space-6);padding:var(--space-6);min-width:0;`)}>
                    <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);flex-wrap:wrap;')}>
                        <div style={sx('display:flex;flex-direction:column;gap:var(--space-2);')}>
                            <span style={sx('font-size:18px;font-weight:500;')}>{v.machSelName}</span>
                            <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{v.machSelCat}</span>
                        </div>
                        <div style={sx('display:flex;gap:var(--space-2);flex-wrap:wrap;')}>
                            <Button variant="ghost" iconOnly icon="pencil-simple" onClick={v.toggleMachEdit} aria-label="Editar" />
                            <Button variant="ghost" iconOnly icon="copy-simple" onClick={v.dupMach} aria-label="Duplicar" />
                            {v.canDeleteMach && <Button variant="ghost" iconOnly icon="trash" onClick={v.askDeleteMach} aria-label="Borrar" />}
                            <Button icon="copy" onClick={v.copyMach}>
                                Copiar
                            </Button>
                            <Button variant="primary" icon="lightning" onClick={v.useMach}>
                                Usar en nueva venta
                            </Button>
                        </div>
                    </div>
                    {v.machEditing ? (
                        <>
                            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);')}>
                                <Field label="Nombre">
                                    <Input value={v.machName} onChange={v.onMachName} maxLength={255} />
                                </Field>
                                <Field label="Categoría">
                                    <Input value={v.machCat} onChange={v.onMachCat} maxLength={100} />
                                </Field>
                            </div>
                            <Textarea
                                value={v.machText}
                                onChange={v.onMachText}
                                rows={14}
                                style={sx('font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.7;resize:vertical;')}
                            />
                            <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                                <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                                    Variables disponibles: se llenan solas con los datos de la venta. Toca una para copiarla y pégala en el texto, con
                                    todo y llaves.
                                </span>
                                <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-2);')}>
                                    {v.machVars.map((variable) => (
                                        <button
                                            key={variable.key}
                                            type="button"
                                            onClick={variable.copy}
                                            title={variable.desc}
                                            className="h-ring"
                                            style={sx(
                                                'border:0;cursor:pointer;font:12px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:999px;background:var(--color-accent-900);color:var(--color-accent-200);',
                                            )}
                                        >
                                            {variable.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <MachoteLines lines={v.machLines} />
                            <span style={sx('font-size:12px;color:var(--color-neutral-300);display:flex;align-items:center;gap:var(--space-2);')}>
                                <Icon name="info" />
                                Los campos resaltados se llenan con los datos de la venta al usarlo.
                            </span>
                        </>
                    )}
                </Card>
            </div>

            <Dialog
                open={v.machDeleteAsk}
                onClose={v.cancelDeleteMach}
                title="Borrar machote"
                icon="trash"
                actions={
                    <>
                        <Button variant="ghost" onClick={v.cancelDeleteMach}>
                            Cancelar
                        </Button>
                        <Button variant="primary" icon="trash" onClick={v.confirmDeleteMach}>
                            Borrar
                        </Button>
                    </>
                }
            >
                <span style={sx('font-size:13px;line-height:1.5;color:var(--color-neutral-200);')}>
                    Se borra la plantilla "{v.machSelName}". Las ventas que ya capturaste con ella no cambian. Esto no se puede deshacer.
                </span>
            </Dialog>
        </>
    );
}
