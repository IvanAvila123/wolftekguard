import { Button, Card, Icon, iconName, MonthSwitcher, PageHeader, StatCard, StatusPicker, StatusTag } from '@/components/nocturne';
import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

function SectionTitle({ icon, children }: { icon?: string; children: string }) {
    return (
        <div style={sx('display:flex;align-items:center;gap:var(--space-3);')}>
            {icon && <Icon name={icon} size={18} color="var(--color-accent)" />}
            <span style={sx('font-size:15px;font-weight:500;white-space:nowrap;')}>{children}</span>
        </div>
    );
}

function SeeAll({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="ghost" onClick={onClick} style={sx('font-size:12px;flex:none;white-space:nowrap;')}>
            Ver todas
        </Button>
    );
}

export default function DashboardScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title="Dashboard"
                subtitle={'Resumen de tus ventas de ' + v.monthLabel}
                compact={v.isMobile}
                actions={<MonthSwitcher label={v.monthLabel} onPrev={v.prevMonth} onNext={v.nextMonth} nextDisabled={v.atLatest} />}
            />

            <section style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-4);')}>
                {v.kpis.map((k) => (
                    <StatCard
                        key={k.label}
                        label={k.label}
                        value={k.value}
                        icon={iconName(k.icon)}
                        highlighted={k.ring !== 'var(--shadow-sm)'}
                        onClick={k.pick}
                    />
                ))}
            </section>

            <section
                style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--space-6);align-items:start;')}
            >
                <Card style={sx('gap:var(--space-4);padding:var(--space-6);')}>
                    <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);')}>
                        <SectionTitle icon="warning">Requieren tu atención</SectionTitle>
                        <SeeAll onClick={v.seeAttention} />
                    </div>
                    {v.attention.map((a) => (
                        <div key={a.id} style={sx('position:relative;display:flex;')}>
                            <button
                                type="button"
                                onClick={a.open}
                                className="h-bg"
                                style={sx(
                                    'border:0;font:inherit;color:inherit;cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-neutral-900);width:100%;',
                                )}
                            >
                                <div style={sx('display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start;')}>
                                    <span style={sx('font-size:13px;font-weight:500;')}>{a.name}</span>
                                    <span aria-hidden="true" style={sx('visibility:hidden;')}>
                                        <StatusTag status={a.status} caret />
                                    </span>
                                </div>
                                <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                                    {a.tipoNice} · {a.fecha}
                                </span>
                                <span style={sx('font-size:12px;color:var(--color-accent-200);display:flex;align-items:center;gap:var(--space-2);')}>
                                    <Icon name="arrow-right" />
                                    {a.next}
                                </span>
                            </button>
                            <span style={sx('position:absolute;top:var(--space-4);right:var(--space-4);')}>
                                <StatusPicker status={a.status} onChange={a.setStatus} />
                            </span>
                        </div>
                    ))}
                </Card>

                <Card style={sx('gap:var(--space-4);padding:var(--space-6);')}>
                    <SectionTitle>Ventas por estatus</SectionTitle>
                    {v.funnel.map((f) => (
                        <button
                            key={f.label}
                            type="button"
                            onClick={f.pick}
                            className="h-acc"
                            style={sx(
                                `border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;display:grid;grid-template-columns:${v.funnelCols};align-items:center;gap:var(--space-4);padding:var(--space-2) 0;font-size:12px;text-align:left;`,
                            )}
                        >
                            <span style={sx('display:flex;align-items:center;gap:var(--space-2);white-space:nowrap;')}>
                                <Icon name={iconName(f.icon)} color="var(--color-neutral-300)" />
                                {f.label}
                            </span>
                            <span style={sx('height:6px;border-radius:3px;background:var(--color-neutral-800);')}>
                                <span style={sx(`display:block;height:100%;border-radius:3px;width:${f.w};background:${f.color};`)}></span>
                            </span>
                            <span style={sx('text-align:right;font-variant-numeric:tabular-nums;')}>{f.n}</span>
                        </button>
                    ))}
                </Card>
            </section>

            <Card as="section" style={sx('padding:var(--space-6);')}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
                    <SectionTitle>Últimas ventas</SectionTitle>
                    <SeeAll onClick={v.goVentas} />
                </div>
                {v.recent.map((r) => (
                    <div key={r.id} style={sx('position:relative;display:flex;')}>
                        <button
                            type="button"
                            onClick={r.open}
                            className="h-bg"
                            style={sx(
                                `border:0;background:transparent;font:inherit;color:inherit;cursor:pointer;text-align:left;display:grid;grid-template-columns:${v.recentCols};align-items:center;gap:var(--space-6);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);width:100%;`,
                            )}
                        >
                            <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                <span style={sx('font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{r.name}</span>
                                <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                                    {r.tipoNice} · {r.lineas} líneas
                                </span>
                            </span>
                            <span style={sx(`font-size:12px;color:var(--color-neutral-300);white-space:nowrap;display:${v.recentDateDisp};`)}>
                                {r.fecha}
                            </span>
                            <span aria-hidden="true" style={sx('visibility:hidden;')}>
                                <StatusTag status={r.status} caret />
                            </span>
                        </button>
                        <span style={sx('position:absolute;top:50%;right:var(--space-4);transform:translateY(-50%);')}>
                            <StatusPicker status={r.status} onChange={r.setStatus} />
                        </span>
                    </div>
                ))}
            </Card>
        </>
    );
}
