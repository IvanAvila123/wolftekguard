import { Button, Card, Chip, PageHeader, SearchInput, Select, StatCard, Tag, type TagVariant } from '@/components/nocturne';
import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

const sortOptions = [
    { value: 'az', label: 'Modelo A–Z' },
    { value: 'mas', label: 'Más piezas primero' },
    { value: 'menos', label: 'Menos piezas primero' },
];

type InvRow = WolftekView['invRows'][number];

function StockTag({ r }: { r: InvRow }) {
    return (
        <Tag variant={r.tagClass.replace('tag tag-', '') as TagVariant} style={sx('font-variant-numeric:tabular-nums;')}>
            {r.totalLabel}
        </Tag>
    );
}

function ModelName({ r }: { r: InvRow }) {
    return (
        <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
            <span style={sx(`line-height:1.4;color:${r.nameColor};`)}>{r.modelo}</span>
            <span style={sx('font-size:11px;color:var(--color-neutral-400);')}>
                {r.oem} · {r.sku}
            </span>
        </span>
    );
}

export default function InventarioScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title="Inventario"
                subtitle={v.ultimaImportacion}
                subtitleIcon="clock-counter-clockwise"
                compact={v.isMobile}
                actions={
                    <>
                        <Button
                            variant="ghost"
                            icon="download-simple"
                            disabled={!v.connection.online}
                            title={v.connection.online ? 'Descarga el formato con el inventario actual' : 'Necesitas conexión'}
                            onClick={() => (window.location.href = route('inventario.plantilla'))}
                        >
                            Plantilla Excel
                        </Button>
                        <Button variant="primary" icon="upload-simple" onClick={v.openImport}>
                            Importar Excel
                        </Button>
                    </>
                }
            />

            <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-4);')}>
                {v.invKpis.map((k) => (
                    <StatCard key={k.label} label={k.label} value={k.value} highlighted={k.ring !== 'var(--shadow-sm)'} onClick={k.pick} />
                ))}
            </section>

            <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                <div style={sx('display:flex;gap:var(--space-4);flex-wrap:wrap;')}>
                    <SearchInput value={v.invQ} onChange={v.onInvQ} placeholder="Buscar modelo o SKU" />
                    <Select
                        value={v.invSort}
                        onChange={v.onInvSort}
                        options={sortOptions}
                        style={sx(`min-width:160px;width:auto;flex:${v.selFlex};`)}
                    />
                </div>
                <div
                    style={sx(
                        `display:flex;gap:var(--space-2);flex-wrap:${v.chipWrap};overflow-x:${v.chipOv};padding-bottom:2px;align-items:center;`,
                    )}
                >
                    {v.oemChips.map((c) => (
                        <Chip key={c.key} active={c.ring !== 'none'} onClick={c.pick}>
                            {c.label}
                        </Chip>
                    ))}
                    <span style={sx('width:1px;height:18px;background:var(--color-neutral-700);margin:0 var(--space-2);')}></span>
                    <Chip active={v.lowChip.ring !== 'none'} icon="warning" onClick={v.toggleLow}>
                        Bajo o sin stock
                    </Chip>
                </div>
            </div>

            <div style={sx(`display:${v.cardsDisp};grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:var(--space-4);`)}>
                {v.invRows.map((r) => (
                    <Card key={r.sku} style={sx('gap:var(--space-4);padding:var(--space-6);font-size:13px;')}>
                        <div style={sx('display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start;')}>
                            <ModelName r={r} />
                            <StockTag r={r} />
                        </div>
                        <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:var(--space-3);font-size:12px;')}>
                            {r.stocks.map((s) => (
                                <span key={s.label} style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                    <span style={sx('font-size:10px;letter-spacing:0.04em;color:var(--color-neutral-400);overflow-wrap:anywhere;')}>
                                        {s.label}
                                    </span>
                                    <span style={sx(`font-variant-numeric:tabular-nums;color:${s.color};`)}>{s.qty}</span>
                                </span>
                            ))}
                        </div>
                        {r.details.some((d) => d.value) && (
                            <div
                                style={sx(
                                    'display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);font-size:12px;color:var(--color-neutral-300);',
                                )}
                            >
                                {r.details
                                    .filter((d) => d.value)
                                    .map((d) => (
                                        <span key={d.label}>
                                            <span style={sx('color:var(--color-neutral-400);')}>{d.label}:</span> {d.value}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            <Card style={sx(`padding:0;overflow-x:auto;display:${v.tableDisp};`)}>
                <table className="table" style={sx('width:100%;font-size:13px;min-width:720px;')}>
                    <thead>
                        <tr>
                            <th style={sx('padding-left:var(--space-6);')}>Modelo</th>
                            {v.invAlmacenes.map((label) => (
                                <th key={label} style={sx('text-align:right;')}>
                                    {label}
                                </th>
                            ))}
                            {v.invExtras.map((label) => (
                                <th key={label}>{label}</th>
                            ))}
                            <th style={sx('text-align:right;padding-right:var(--space-6);')}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {v.invRows.map((r) => (
                            <tr key={r.sku} className="h-bg">
                                <td style={sx('padding:12px 10px 12px var(--space-6);')}>
                                    <ModelName r={r} />
                                </td>
                                {r.stocks.map((s) => (
                                    <td
                                        key={s.label}
                                        style={sx(`padding:12px 10px;text-align:right;font-variant-numeric:tabular-nums;color:${s.color};`)}
                                    >
                                        {s.qty}
                                    </td>
                                ))}
                                {r.details.map((d) => (
                                    <td key={d.label} style={sx('padding:12px 10px;color:var(--color-neutral-300);')}>
                                        {d.value}
                                    </td>
                                ))}
                                <td style={sx('padding:12px var(--space-6) 12px 10px;text-align:right;')}>
                                    <StockTag r={r} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </>
    );
}
