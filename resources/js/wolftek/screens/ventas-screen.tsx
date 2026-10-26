import {
    Button,
    Card,
    CardButton,
    Chip,
    Icon,
    iconName,
    MonthSwitcher,
    PageHeader,
    PriorityBars,
    SearchInput,
    Select,
    StatusPicker,
    StatusTag,
} from '@/components/nocturne';
import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

function EmptyRows({ v, padded }: { v: WolftekView; padded?: boolean }) {
    return (
        <div
            style={sx(
                `display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-3);font-size:13px;color:var(--color-neutral-300);${padded ? 'padding:var(--space-8) var(--space-6);' : ''}`,
            )}
        >
            No hay ventas con estos filtros.
            <Button onClick={v.clearFilters}>Limpiar filtros</Button>
        </div>
    );
}

function DocStatus({ icon, color, label, size }: { icon: string; color: string; label: string; size?: number }) {
    return (
        <span style={sx(`display:flex;align-items:center;gap:var(--space-2);white-space:nowrap;color:${color};`)}>
            <Icon name={iconName(icon)} size={size} />
            {label}
        </span>
    );
}

export default function VentasScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title="Ventas"
                subtitle={v.ventasCount + ' ventas en ' + v.monthLabel}
                compact={v.isMobile}
                actions={
                    <div style={sx('display:flex;align-items:center;gap:var(--space-3);')}>
                        <Button variant="ghost" icon="archive" onClick={v.openArchived}>
                            Archivadas
                        </Button>
                        <MonthSwitcher label={v.monthLabel} onPrev={v.prevMonth} onNext={v.nextMonth} nextDisabled={v.atLatest} />
                    </div>
                }
            />

            <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                <div style={sx('display:flex;gap:var(--space-4);flex-wrap:wrap;')}>
                    <SearchInput value={v.q} onChange={v.onSearch} placeholder="Buscar por cliente, tipo, cuenta o ID CTE" />
                    <Select
                        value={v.prio}
                        onChange={v.onPrio}
                        options={v.prioOptions.map((p) => ({ value: p.v, label: p.label }))}
                        style={sx(`min-width:170px;width:auto;flex:${v.selFlex};`)}
                    />
                </div>
                <div style={sx(`display:flex;gap:var(--space-2);flex-wrap:${v.chipWrap};overflow-x:${v.chipOv};padding-bottom:2px;`)}>
                    {v.chips.map((c) => (
                        <Chip key={c.key} active={c.ring !== 'none'} count={c.n} onClick={c.pick}>
                            {c.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <div style={sx(`display:${v.cardsDisp};grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:var(--space-4);`)}>
                {v.rows.map((r) => (
                    <div key={r.id} style={sx('position:relative;display:flex;')}>
                        <CardButton
                            onClick={r.open}
                            style={sx('display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-6);width:100%;')}
                        >
                            <div style={sx('display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);')}>
                                <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                    <span style={sx('font-size:14px;font-weight:500;line-height:1.35;')}>{r.name}</span>
                                    <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{r.tipoNice}</span>
                                </span>
                                {/* Keeps the tag's place; the picker on top of the card is the one you touch. */}
                                <span aria-hidden="true" style={sx('visibility:hidden;')}>
                                    <StatusTag status={r.status} caret />
                                </span>
                            </div>
                            <div
                                style={sx(
                                    'display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-6);font-size:12px;color:var(--color-neutral-300);font-variant-numeric:tabular-nums;',
                                )}
                            >
                                <span>
                                    Cuenta <span style={sx('color:var(--color-text);')}>{r.cuenta}</span>
                                </span>
                                <span>
                                    ID CTE <span style={sx('color:var(--color-text);')}>{r.idcte}</span>
                                </span>
                                <span>{r.lineas} líneas</span>
                            </div>
                            <div
                                style={sx(
                                    'display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);font-size:12px;color:var(--color-neutral-300);',
                                )}
                            >
                                <span style={sx('display:flex;align-items:center;gap:var(--space-2);')}>
                                    <Icon name="calendar-blank" />
                                    {r.fecha}
                                    <span style={sx('margin-left:var(--space-3);')}>
                                        <DocStatus icon={r.docIcon} color={r.docColor} label={r.docShort} />
                                    </span>
                                </span>
                                <PriorityBars prioridad={r.prioridad} label={r.prioridad} />
                            </div>
                        </CardButton>
                        <span style={sx('position:absolute;top:var(--space-6);right:var(--space-6);')}>
                            <StatusPicker status={r.status} onChange={r.setStatus} />
                        </span>
                    </div>
                ))}
            </div>
            {v.noRowsCards && <EmptyRows v={v} />}

            <Card style={sx(`padding:0;overflow-x:auto;display:${v.tableDisp};`)}>
                <table className="table" style={sx('width:100%;font-size:13px;min-width:860px;')}>
                    <thead>
                        <tr>
                            <th style={sx('padding-left:var(--space-6);')}>Venta</th>
                            <th>Cuenta · ID CTE</th>
                            <th style={sx('text-align:right;')}>Líneas</th>
                            <th>Prioridad</th>
                            <th>Expediente</th>
                            <th>Estatus</th>
                            <th style={sx('padding-right:var(--space-6);')}>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {v.rows.map((r) => (
                            <tr key={r.id} onClick={r.open} className="h-bg" style={sx('cursor:pointer;')}>
                                <td style={sx('padding:12px 10px 12px var(--space-6);')}>
                                    <div style={sx('display:flex;flex-direction:column;gap:2px;')}>
                                        <span style={sx('font-weight:500;')}>{r.name}</span>
                                        <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{r.tipoNice}</span>
                                    </div>
                                </td>
                                <td
                                    style={sx(
                                        'padding:12px 10px;font-variant-numeric:tabular-nums;color:var(--color-neutral-200);white-space:nowrap;',
                                    )}
                                >
                                    {r.cuenta} · {r.idcte}
                                </td>
                                <td style={sx('padding:12px 10px;text-align:right;font-variant-numeric:tabular-nums;')}>{r.lineas}</td>
                                <td style={sx('padding:12px 10px;')}>
                                    <PriorityBars
                                        prioridad={r.prioridad}
                                        label={<span style={sx('font-size:12px;color:var(--color-neutral-200);')}>{r.prioridad}</span>}
                                    />
                                </td>
                                <td style={sx('padding:12px 10px;font-size:12px;')}>
                                    <DocStatus icon={r.docIcon} color={r.docColor} label={r.docLabel} size={15} />
                                </td>
                                <td style={sx('padding:12px 10px;')}>
                                    <StatusPicker status={r.status} onChange={r.setStatus} />
                                </td>
                                <td style={sx('padding:12px var(--space-6) 12px 10px;color:var(--color-neutral-300);white-space:nowrap;')}>
                                    {r.fecha}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {v.rows.length === 0 && <EmptyRows v={v} padded />}
            </Card>
        </>
    );
}
