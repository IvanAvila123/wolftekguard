import {
    Button,
    Card,
    DocList,
    Field,
    Icon,
    iconName,
    Input,
    MachoteLines,
    MatchBlock,
    PageHeader,
    Segmented,
    Select,
    Switch,
    Tag,
    Textarea,
    type TagVariant,
} from '@/components/nocturne';

import type { WolftekView } from '../use-wolftek';
import { sx } from '../utils';

type FormFieldView = WolftekView['clienteFields'][number];
type BotView = WolftekView['bots'][number];

const sectionTitle = 'font-size:15px;font-weight:500;';
const fieldGrid = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-6);';
const kicker = 'font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-300);';
const accentNotice =
    'display:flex;flex-direction:column;gap:var(--space-4);padding:var(--space-4) var(--space-6);border-radius:var(--radius-md);background:var(--color-accent-900);box-shadow:inset 0 0 0 1px var(--color-accent-700);';

/** `tag tag-accent` → `accent` */
const tagVariant = (tagClass: string) => tagClass.replace('tag tag-', '') as TagVariant;

function FormField({ fd, onChange }: { fd: FormFieldView; onChange: WolftekView['setField'] }) {
    const invalid = !!fd.ring;

    return (
        <Field label={fd.label} required={!!fd.req} full={fd.col !== 'auto'} error={invalid ? fd.msg : null} hint={invalid ? undefined : fd.msg}>
            <Input name={fd.k} value={fd.v} placeholder={fd.ph} inputMode={fd.mode} onChange={onChange} invalid={invalid} />
        </Field>
    );
}

function ClienteStep({ v }: { v: WolftekView }) {
    return (
        <>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-6);')}>
                <span style={sx(sectionTitle)}>Datos del cliente</span>
                {v.hasClientSugg && (
                    <div style={sx(accentNotice)}>
                        <span style={sx('display:flex;align-items:center;gap:var(--space-2);font-size:12px;color:var(--color-accent-100);')}>
                            <Icon name="user-circle-check" size={16} />
                            {v.clientSuggTitle}
                        </span>
                        {v.clientSugg.map((cs) => (
                            <div
                                key={cs.key}
                                style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;')}
                            >
                                <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;')}>
                                    <span style={sx('font-size:13px;font-weight:500;line-height:1.4;')}>{cs.name}</span>
                                    <span style={sx('font-size:11px;line-height:1.4;color:var(--color-neutral-300);')}>{cs.sub}</span>
                                </span>
                                <div style={sx('display:flex;gap:var(--space-2);')}>
                                    <Button variant="ghost" onClick={cs.dismiss} style={sx('white-space:nowrap;')}>
                                        No es este
                                    </Button>
                                    <Button variant="primary" icon="lightning" onClick={cs.apply} style={sx('white-space:nowrap;')}>
                                        Llenar datos
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={sx(fieldGrid)}>
                    {v.clienteFields.map((fd) => (
                        <FormField key={fd.k} fd={fd} onChange={v.setField} />
                    ))}
                </div>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-6);')}>
                <span style={sx(sectionTitle)}>Entrega</span>
                <div style={sx(fieldGrid)}>
                    {v.entregaFields.map((fd) => (
                        <FormField key={fd.k} fd={fd} onChange={v.setField} />
                    ))}
                    <Field label="Tipo de venta">
                        <Select name="tipo" value={v.form.tipo} onChange={v.setField} options={v.tipoOptions} />
                    </Field>
                </div>
            </div>
        </>
    );
}

function EquipoPicker({ b, eqCols }: { b: BotView; eqCols: string }) {
    return (
        <div style={sx(`display:grid;grid-template-columns:${eqCols};gap:var(--space-4);grid-column:1 / -1;align-items:start;`)}>
            <Field label="Equipo" required asDiv style={sx('position:relative;min-width:0;')}>
                <button
                    type="button"
                    onClick={b.openPicker}
                    className="input"
                    aria-haspopup="listbox"
                    aria-expanded={b.pickerOpen}
                    style={sx(
                        `width:100%;cursor:pointer;text-align:left;font:inherit;font-size:13px;display:flex;align-items:center;gap:var(--space-3);color:${b.eqColor};`,
                    )}
                >
                    <Icon name="device-mobile" color="var(--color-neutral-400)" />
                    <span style={sx('flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')}>{b.eqLabel}</span>
                    <Icon name="caret-up-down" color="var(--color-neutral-400)" />
                </button>
                {b.hasStock && (
                    <div style={sx('display:flex;align-items:center;gap:var(--space-2) var(--space-4);flex-wrap:wrap;font-size:11px;')}>
                        <span style={sx(`display:flex;align-items:center;gap:var(--space-2);white-space:nowrap;color:${b.stockColor};`)}>
                            <Icon name={iconName(b.stockIcon)} />
                            {b.stockLabel}
                        </span>
                        {b.hasAlt && (
                            <button
                                type="button"
                                onClick={b.useAlt}
                                className="h-acc"
                                style={sx(
                                    'white-space:nowrap;border:0;background:transparent;padding:0;font:inherit;font-size:11px;color:var(--color-accent-300);cursor:pointer;',
                                )}
                            >
                                {b.altLabel}
                            </button>
                        )}
                    </div>
                )}
                {b.pickerOpen && (
                    <>
                        <div onClick={b.closePicker} style={sx('position:fixed;inset:0;z-index:7;')}></div>
                        <Card
                            elevation="lg"
                            role="listbox"
                            style={sx(
                                'position:absolute;left:0;right:0;top:calc(100% - 2px);z-index:8;padding:var(--space-3);min-width:min(100%,320px);',
                            )}
                        >
                            <div style={sx('position:relative;')}>
                                <Icon
                                    name="magnifying-glass"
                                    style={sx('position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-neutral-400);')}
                                />
                                <Input
                                    autoFocus
                                    value={b.pq}
                                    onChange={b.onPq}
                                    onKeyDown={b.onPqKey}
                                    placeholder="Busca como quieras: ip 17 pro azul, s25, honor negro"
                                    style={sx('width:100%;padding-left:30px;')}
                                />
                            </div>
                            <span style={sx('font-size:11px;color:var(--color-neutral-400);padding:0 var(--space-2);')}>{b.resultsLabel}</span>
                            <div style={sx('max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;')}>
                                {b.items.map((it) => (
                                    <button
                                        key={it.key}
                                        type="button"
                                        onClick={it.pick}
                                        role="option"
                                        aria-selected={it.sku === b.sku}
                                        className="h-bg"
                                        style={sx(
                                            `height:auto;min-height:44px;line-height:1.4;border:0;font:inherit;color:var(--color-text);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-3);border-radius:var(--radius-sm);text-align:left;background:${it.bg};`,
                                        )}
                                    >
                                        <span style={sx('display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;')}>
                                            <span
                                                style={sx(`display:block;font-size:13px;line-height:1.4;white-space:normal;color:${it.nameColor};`)}
                                            >
                                                {it.name}
                                            </span>
                                            <span
                                                style={sx(
                                                    'display:block;font-size:11px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--color-neutral-400);',
                                                )}
                                            >
                                                {it.oem} · {it.sku}
                                            </span>
                                        </span>
                                        <Tag variant={tagVariant(it.tagClass)} style={sx('font-variant-numeric:tabular-nums;')}>
                                            {it.stockLabel}
                                        </Tag>
                                    </button>
                                ))}
                                {b.noItems && (
                                    <div
                                        style={sx(
                                            'padding:var(--space-4) var(--space-3);font-size:12px;line-height:1.5;color:var(--color-neutral-300);',
                                        )}
                                    >
                                        No encontramos "{b.pq}". Prueba con menos palabras, por ejemplo solo el modelo.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </>
                )}
            </Field>
            <Field label="SKU" error={b.hasSkuMsg ? 'Este SKU no está en el inventario' : null}>
                <Input
                    value={b.sku}
                    onChange={b.onSku}
                    placeholder="Se llena al elegir equipo"
                    invalid={b.hasSkuMsg}
                    style={sx('font-variant-numeric:tabular-nums;')}
                />
            </Field>
        </div>
    );
}

function DnInput({ b }: { b: BotView }) {
    return (
        <Field label="Números de teléfono (DN)" required error={b.dnMsg || null}>
            <div
                style={sx(
                    'display:flex;flex-wrap:wrap;gap:var(--space-2);padding:var(--space-2);border-radius:var(--radius-md);background:var(--color-bg);box-shadow:inset 0 0 0 1px var(--color-neutral-700);',
                )}
            >
                {b.dns.map((dn) => (
                    <Tag
                        key={dn.key}
                        variant={tagVariant(dn.cls)}
                        icon={dn.hasIcon ? iconName(dn.icon) : undefined}
                        title={dn.title}
                        style={sx('gap:var(--space-2);font-variant-numeric:tabular-nums;')}
                    >
                        {dn.n}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                dn.remove();
                            }}
                            aria-label="Quitar"
                            style={sx('border:0;background:transparent;padding:0;color:inherit;cursor:pointer;display:flex;')}
                        >
                            <Icon name="x" />
                        </button>
                    </Tag>
                ))}
                <input
                    value={b.dnDraft}
                    onChange={b.onDn}
                    onKeyDown={b.onDnKey}
                    inputMode="numeric"
                    placeholder="Escribe un DN y presiona Enter, o pega una lista"
                    style={sx(
                        'flex:1;min-width:200px;border:0;background:transparent;color:var(--color-text);font:inherit;font-size:13px;outline:none;padding:var(--space-2);',
                    )}
                />
            </div>
            {b.hasDup && (
                <span style={sx('font-size:11px;line-height:1.5;color:var(--color-accent-200);display:flex;gap:var(--space-2);')}>
                    <Icon name="warning" style={sx('margin-top:2px;')} />
                    {b.dupMsg}
                </span>
            )}
            {b.hasOther && (
                <div
                    style={sx('display:flex;flex-direction:column;gap:var(--space-2);font-size:11px;line-height:1.5;color:var(--color-neutral-200);')}
                >
                    <span style={sx('display:flex;gap:var(--space-2);')}>
                        <Icon name="link" color="var(--color-accent-300)" style={sx('margin-top:2px;flex:none;')} />
                        {b.otherMsg}
                    </span>
                    <div style={sx('display:flex;flex-wrap:wrap;gap:var(--space-2);')}>
                        {b.others.map((ot) => (
                            <button
                                key={ot.key}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    ot.open();
                                }}
                                className="h-ring"
                                style={sx(
                                    'border:0;font:inherit;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) var(--space-3);border-radius:999px;white-space:nowrap;background:var(--color-neutral-800);color:var(--color-neutral-100);box-shadow:inset 0 0 0 1px var(--color-neutral-700);',
                                )}
                            >
                                <Icon name="arrow-square-out" />
                                {ot.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Field>
    );
}

function BotCard({ v, b }: { v: WolftekView; b: BotView }) {
    return (
        <div
            style={sx(
                'display:flex;flex-direction:column;gap:var(--space-6);padding:var(--space-6);border-radius:var(--radius-lg);background:var(--color-neutral-900);box-shadow:var(--shadow-sm);',
            )}
        >
            <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;')}>
                <div style={sx('display:flex;align-items:baseline;gap:var(--space-3);')}>
                    <span style={sx('font-size:14px;font-weight:500;color:var(--color-accent-200);')}>BOT {b.n}</span>
                    <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{b.count} líneas</span>
                </div>
                <div style={sx('display:flex;align-items:center;gap:var(--space-3);')}>
                    <Segmented
                        options={[
                            { value: 'con', label: 'Con costo' },
                            { value: 'sin', label: 'Sin costo' },
                        ]}
                        value={b.costo ? 'con' : 'sin'}
                        onChange={(value) => (value === 'con' ? b.setCon() : b.setSin())}
                    />
                    {b.canRemove && <Button variant="ghost" iconOnly icon="trash" onClick={b.remove} aria-label="Eliminar BOT" />}
                </div>
            </div>

            <DnInput b={b} />

            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-6);')}>
                <EquipoPicker b={b} eqCols={v.eqCols} />
                <Field label="Plan">
                    <Input value={b.plan} onChange={b.onPlan} placeholder="ATT Armalo Negocios 499 MPP LIBRE" />
                </Field>
                <Field label="Plazo">
                    <Select value={b.plazo} onChange={b.onPlazo} options={v.plazos} />
                </Field>
                <Field label="DMR (descuento multirenta)">
                    <Input value={b.dmr} onChange={b.onDmr} placeholder="Ej. 10%" />
                </Field>
                <Field label="Protección de equipo" asDiv>
                    <Switch checked={b.proteccion} onChange={b.toggleProt} label={b.protLabel} />
                </Field>
                <Field label="Redes" full>
                    <Input value={b.redes} onChange={b.onRedes} placeholder="Google_maps; Facebook; WhatsApp (Texto); Gmail; Instagram" />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            b.defRedes();
                        }}
                        className="h-acc"
                        style={sx(
                            'align-self:flex-start;border:0;background:transparent;padding:0;font:inherit;font-size:12px;color:var(--color-accent-300);cursor:pointer;',
                        )}
                    >
                        Usar redes predeterminadas
                    </button>
                </Field>
            </div>
        </div>
    );
}

function LineasStep({ v }: { v: WolftekView }) {
    return (
        <>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-2);')}>
                <span style={sx(sectionTitle)}>BOTs y líneas</span>
                <span style={sx('font-size:12px;color:var(--color-neutral-300);line-height:1.5;')}>
                    Cada BOT es con costo o sin costo. Si una línea tiene costo distinto, agrégala en otro BOT. El total de líneas se calcula con los
                    DN.
                </span>
            </div>
            {v.hasDups && (
                <div
                    role="alert"
                    style={sx(
                        'display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:var(--space-4) var(--space-6);border-radius:var(--radius-md);background:var(--color-accent-900);box-shadow:inset 0 0 0 1px var(--color-accent-600);color:var(--color-accent-100);font-size:13px;',
                    )}
                >
                    <span style={sx('display:flex;align-items:center;gap:var(--space-3);')}>
                        <Icon name="warning-circle" size={18} />
                        {v.dupBanner}
                    </span>
                    <Button onClick={v.fixDups}>Quitar duplicados</Button>
                </div>
            )}
            {v.bots.map((b) => (
                <BotCard key={b.n} v={v} b={b} />
            ))}
            <Button block icon="plus" onClick={v.addBot}>
                Agregar BOT
            </Button>
        </>
    );
}

function CondicionesStep({ v }: { v: WolftekView }) {
    return (
        <>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                <div style={sx('display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;')}>
                    <span style={sx(sectionTitle)}>Meses gratis</span>
                    <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>{v.mesesLabel}</span>
                </div>
                <span style={sx('font-size:12px;color:var(--color-neutral-300);')}>
                    Marca los meses de la renta que no se cobran. Puedes elegir varios.
                </span>
                <div style={sx(`display:grid;grid-template-columns:${v.mesesCols};gap:var(--space-2);`)}>
                    {v.meses.map((m) => (
                        <button
                            key={m.n}
                            type="button"
                            onClick={m.toggle}
                            aria-pressed={m.on}
                            className="h-ring"
                            style={sx(
                                `border:0;font:inherit;font-size:12px;cursor:pointer;height:34px;border-radius:var(--radius-md);font-variant-numeric:tabular-nums;background:${m.bg};color:${m.color};box-shadow:${m.ring};`,
                            )}
                        >
                            {m.n}
                        </button>
                    ))}
                </div>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-6);')}>
                <span style={sx(sectionTitle)}>Seguimiento</span>
                <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-6);')}>
                    <Field label="Estatus de la venta">
                        <Select name="status" value={v.form.status} onChange={v.setField} options={v.statusList} />
                    </Field>
                    <Field label="Fecha de cierre">
                        <Input type="date" name="cierre" value={v.form.cierre} onChange={v.setField} style={sx('color-scheme:dark;')} />
                    </Field>
                    <Field label="Prioridad" asDiv full>
                        <Segmented
                            options={v.prioSeg.map((ps) => ({ value: ps.label, label: ps.label }))}
                            value={v.form.prioridad}
                            onChange={(value) => v.prioSeg.find((ps) => ps.label === value)?.pick()}
                            style={sx('align-self:flex-start;')}
                        />
                    </Field>
                    <Field label="Notas" full>
                        <Textarea
                            name="notas"
                            value={v.form.notas}
                            onChange={v.setField}
                            rows={3}
                            placeholder="Notas adicionales"
                            style={sx('resize:vertical;font:inherit;')}
                        />
                    </Field>
                </div>
            </div>
        </>
    );
}

function RevisionStep({ v }: { v: WolftekView }) {
    return (
        <>
            <span style={sx(sectionTitle)}>Revisa antes de guardar</span>
            {v.review.map((rv) => (
                <div key={rv.title} style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                    <div style={sx('display:flex;align-items:center;justify-content:space-between;')}>
                        <span style={sx(kicker)}>{rv.title}</span>
                        <Button variant="ghost" icon="pencil-simple" onClick={rv.edit} style={sx('font-size:12px;')}>
                            Editar
                        </Button>
                    </div>
                    <dl
                        style={sx(
                            'display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:var(--space-3) var(--space-6);margin:0;font-size:13px;',
                        )}
                    >
                        {rv.rows.map((rr) => (
                            <div key={rr.k} style={sx('display:contents;')}>
                                <dt style={sx('color:var(--color-neutral-300);')}>{rr.k}</dt>
                                <dd style={sx(`margin:0;color:${rr.color};`)}>{rr.v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);')}>
                    <span style={sx(kicker)}>Expediente</span>
                    <Tag variant={tagVariant(v.formDocTag)}>{v.formDocCount}</Tag>
                </div>
                {v.formDocMissing && <span style={sx('font-size:12px;line-height:1.5;color:var(--color-neutral-300);')}>{v.formDocMissingMsg}</span>}
                <DocList
                    docs={v.formDocs.map((dc) => ({ ...dc, icon: iconName(dc.icon) }))}
                    extras={v.formOtros.items}
                    onAddExtras={v.formOtros.add}
                />
            </div>
            <MatchBlock text={v.matchText} onCopy={v.copyMatch} onDownload={v.downloadTxt} />
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-4);')}>
                <div style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;')}>
                    <span style={sx(kicker)}>Mensaje de machote</span>
                    <div style={sx('display:flex;gap:var(--space-3);')}>
                        <Select
                            value={v.reviewMach}
                            onChange={v.onReviewMach}
                            options={v.machOptions.map((mo) => ({ value: mo.i, label: mo.name }))}
                            style={sx('font-size:12px;width:auto;')}
                        />
                        <Button icon="copy" onClick={v.copyReview} style={sx('white-space:nowrap;flex:none;')}>
                            Copiar
                        </Button>
                    </div>
                </div>
                <MachoteLines lines={v.reviewLines} />
            </div>
        </>
    );
}

function ProgressAside({ v }: { v: WolftekView }) {
    return (
        <Card as="aside" style={sx(`gap:var(--space-6);padding:var(--space-6);position:${v.nvAsidePos};top:var(--space-8);`)}>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                <div style={sx('display:flex;justify-content:space-between;font-size:13px;')}>
                    <span style={sx('font-weight:500;')}>Progreso</span>
                    <span style={sx('color:var(--color-neutral-300);')}>
                        {v.doneCount} de {v.checkTotal}
                    </span>
                </div>
                <div style={sx('height:4px;border-radius:2px;background:var(--color-neutral-800);')}>
                    <div style={sx(`height:100%;border-radius:2px;background:var(--color-accent);width:${v.progressW};`)}></div>
                </div>
            </div>
            <div style={sx('display:flex;flex-direction:column;gap:var(--space-3);')}>
                {v.checklist.map((ck) => {
                    const done = ck.icon.startsWith('ph-fill');

                    return (
                        <button
                            key={ck.label}
                            type="button"
                            onClick={ck.go}
                            className="h-text"
                            style={sx(
                                `border:0;background:transparent;padding:0;font:inherit;cursor:pointer;display:flex;align-items:center;gap:var(--space-3);font-size:12px;text-align:left;color:${ck.color};`,
                            )}
                        >
                            <Icon name={iconName(ck.icon)} weight={done ? 'fill' : 'regular'} size={15} color={ck.iconColor} />
                            {ck.label}
                        </button>
                    );
                })}
            </div>
            <div
                style={sx(
                    'display:flex;flex-direction:column;gap:var(--space-3);padding-top:var(--space-4);border-top:1px solid var(--color-neutral-800);font-size:12px;',
                )}
            >
                {(
                    [
                        ['Total de líneas', v.lineTotal],
                        ['BOTs', v.botCount],
                        ['Estatus', v.form.status],
                        ['Prioridad', v.form.prioridad],
                    ] as [string, string | number][]
                ).map(([label, value]) => (
                    <div key={label} style={sx('display:flex;justify-content:space-between;')}>
                        <span style={sx('color:var(--color-neutral-300);')}>{label}</span>
                        <span style={sx('font-variant-numeric:tabular-nums;')}>{value}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export default function NuevaScreen({ v }: { v: WolftekView }) {
    return (
        <>
            <PageHeader
                title={v.nvTitle}
                subtitle={v.nvSub}
                subtitleIcon={iconName(v.nvSubIcon)}
                onBack={v.goVentas}
                compact={v.isMobile}
                actions={
                    <>
                        {v.hasDraftHere && (
                            <Button variant="ghost" icon="arrow-counter-clockwise" onClick={v.startOver} style={sx('white-space:nowrap;')}>
                                Empezar de cero
                            </Button>
                        )}
                        <Button variant="ghost" icon="magic-wand" onClick={v.loadExample}>
                            Cargar ejemplo
                        </Button>
                        <Button icon="clipboard-text" onClick={v.openMachDialog}>
                            Usar machote
                        </Button>
                    </>
                }
            />

            <nav style={sx('display:flex;gap:var(--space-2);flex-wrap:wrap;')}>
                {v.steps.map((st) => (
                    <button
                        key={st.label}
                        type="button"
                        onClick={st.go}
                        className="h-bg"
                        style={sx(
                            `border:0;font:inherit;cursor:pointer;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:${st.bg};color:${st.color};font-size:13px;`,
                        )}
                    >
                        <span
                            style={sx(
                                `width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;box-shadow:inset 0 0 0 1px ${st.dotRing};background:${st.dotBg};color:${st.dotColor};`,
                            )}
                        >
                            {st.mark}
                        </span>
                        <span style={sx(`display:${st.labelDisp};`)}>{st.label}</span>
                    </button>
                ))}
            </nav>

            <div style={sx('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:var(--space-6);align-items:start;')}>
                <div style={sx(`display:grid;grid-template-columns:${v.nvCols};gap:var(--space-6);align-items:start;`)}>
                    <Card style={sx(`gap:var(--space-8);padding:${v.nvPad};min-width:0;`)}>
                        {v.step === 0 && <ClienteStep v={v} />}
                        {v.step === 1 && <LineasStep v={v} />}
                        {v.step === 2 && <CondicionesStep v={v} />}
                        {v.step === 3 && <RevisionStep v={v} />}

                        <div
                            style={sx('display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding-top:var(--space-4);')}
                        >
                            <Button variant="ghost" icon="arrow-left" onClick={v.prevStep} disabled={v.isFirstStep}>
                                Anterior
                            </Button>
                            <Button variant="primary" iconRight={iconName(v.nextIcon)} onClick={v.nextStep}>
                                {v.nextLabel}
                            </Button>
                        </div>
                    </Card>
                    <ProgressAside v={v} />
                </div>
            </div>
        </>
    );
}
