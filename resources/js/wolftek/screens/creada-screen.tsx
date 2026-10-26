import { Button, Card, Icon, MatchBlock, PageHeader } from '@/components/nocturne';
import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

function SuccessBadge() {
    return (
        <span
            style={sx(
                'width:36px;height:36px;flex:none;border-radius:50%;display:grid;place-items:center;background:var(--color-accent-900);color:var(--color-accent-200);font-size:20px;box-shadow:inset 0 0 0 1px var(--color-accent-600);',
            )}
        >
            <Icon name="check" />
        </span>
    );
}

export default function CreadaScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title="Venta creada"
                subtitle={`${v.createdName} · ${v.createdLines} líneas en ${v.createdBots} BOT`}
                leading={<SuccessBadge />}
                compact={v.isMobile}
                actions={
                    <>
                        <Button onClick={v.goVentas}>Ir a ventas</Button>
                        <Button variant="primary" icon="plus" onClick={v.goNueva}>
                            Crear otra venta
                        </Button>
                    </>
                }
            />

            {v.createdHasShort && (
                <div
                    style={sx(
                        'display:flex;align-items:center;gap:var(--space-3);padding:var(--space-4) var(--space-6);border-radius:var(--radius-md);background:var(--color-accent-900);box-shadow:inset 0 0 0 1px var(--color-accent-700);color:var(--color-accent-100);font-size:13px;line-height:1.5;',
                    )}
                >
                    <Icon name="package" size={18} style={sx('flex:none;')} />
                    {v.createdShortMsg}
                </div>
            )}

            <div style={sx('display:flex;gap:var(--space-6);flex-wrap:wrap;align-items:flex-start;')}>
                <Card style={sx('flex:2 1 480px;padding:var(--space-8);min-width:0;')}>
                    <MatchBlock text={v.matchText} onCopy={v.copyMatch} onDownload={v.downloadTxt} />
                </Card>
                <Card style={sx('flex:1 1 280px;gap:var(--space-4);padding:var(--space-8);min-width:0;')}>
                    <span style={sx('font-size:18px;font-weight:500;')}>Archivos CSV</span>
                    <span style={sx('font-size:12px;color:var(--color-neutral-300);line-height:1.5;')}>
                        Un archivo por BOT, uno con todas las líneas con costo y otro con las sin costo.
                    </span>
                    {v.csvFiles.map((cf) => (
                        <div
                            key={cf.file}
                            style={sx(
                                `display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);opacity:${cf.opacity};`,
                            )}
                        >
                            <span style={sx('display:flex;align-items:center;gap:var(--space-3);min-width:0;')}>
                                <Icon name="file-csv" size={20} color="var(--color-accent)" style={sx('flex:none;')} />
                                <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                    <span style={sx('font-size:13px;')}>{cf.label}</span>
                                    <span
                                        style={sx(
                                            'font-size:11px;color:var(--color-neutral-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
                                        )}
                                    >
                                        {cf.file} · {cf.sub}
                                    </span>
                                </span>
                            </span>
                            <Button variant="ghost" iconOnly icon="download-simple" onClick={cf.dl} disabled={cf.disabled} aria-label="Descargar" />
                        </div>
                    ))}
                    <Button block icon="download-simple" onClick={v.downloadAllCsv}>
                        Descargar todos
                    </Button>
                </Card>
            </div>
        </>
    );
}
