import type { Bot, SaleForm } from './utils';

/**
 * Three-way comparison for an edit that hit a version conflict:
 * - base: the sale when the edit started (editOrig),
 * - mine: the form being saved,
 * - theirs: the sale as the server has it now.
 * A field only one side changed is merged on its own; one both sides changed differently is the user's choice.
 */

/** A sale's form and BOTs, the part of it the edit form saves. */
export type SaleSide = { form: SaleForm; bots: Bot[] };

export type Pick = 'mine' | 'theirs';

type FormKey = Exclude<keyof SaleForm, 'docs'>;

/** A field that differs between the edit and the sale as it is now. */
export type FieldChange = {
    key: FormKey | 'bots';
    label: string;
    mine: string;
    theirs: string;
    /** 'mine': only the edit changed it · 'theirs': only the other side did · 'both': the user chooses. */
    who: Pick | 'both';
};

const FIELDS: [FormKey, string][] = [
    ['nombre', 'Nombre de la venta'],
    ['razon', 'Razón social'],
    ['cuenta', 'Cuenta AT&T'],
    ['idcte', 'ID CTE'],
    ['rfc', 'RFC'],
    ['rl', 'Representante legal'],
    ['acuerdo', 'Acuerdo'],
    ['fp', 'FP'],
    ['domicilio', 'Domicilio'],
    ['encargada', 'Encargada'],
    ['telefono', 'Teléfono'],
    ['horario', 'Horario'],
    ['tipo', 'Tipo'],
    ['status', 'Estatus'],
    ['prioridad', 'Prioridad'],
    ['cierre', 'Fecha de cierre'],
    ['notas', 'Notas'],
    ['meses', 'Meses gratis'],
];

const fieldText = (form: SaleForm, key: FormKey): string => {
    const value = form[key];

    return Array.isArray(value) ? value.join(', ') : String(value ?? '');
};

/** What identifies a BOT (leaving out search box and message state). */
const botKey = (bots: Bot[]) => JSON.stringify(bots.map((b) => [b.costo, b.equipo, b.sku, b.plan, b.plazo, b.proteccion, b.dmr, b.redes, b.dns]));

const botsText = (bots: Bot[]) =>
    bots.map((b, i) => `BOT ${i + 1} · ${b.costo ? 'con' : 'sin'} costo · ${b.dns.length} DN · ${b.equipo || 'sin equipo'}`).join('\n');

const whoChanged = (base: string | null, mine: string, theirs: string): Pick | 'both' => {
    if (base === null) {
        return 'both';
    }

    if (mine === base) {
        return 'theirs';
    }

    return theirs === base ? 'mine' : 'both';
};

/** Every field where the edit and the current sale differ, and who changed it. Without a base everything is the user's choice. */
export function compareSides(base: SaleSide | null, mine: SaleSide, theirs: SaleSide): FieldChange[] {
    const changes: FieldChange[] = [];

    FIELDS.forEach(([key, label]) => {
        const m = fieldText(mine.form, key);
        const t = fieldText(theirs.form, key);

        if (m !== t) {
            changes.push({ key, label, mine: m, theirs: t, who: whoChanged(base ? fieldText(base.form, key) : null, m, t) });
        }
    });

    const m = botKey(mine.bots);
    const t = botKey(theirs.bots);

    if (m !== t) {
        changes.push({
            key: 'bots',
            label: 'BOTs y líneas',
            mine: botsText(mine.bots),
            theirs: botsText(theirs.bots),
            who: whoChanged(base ? botKey(base.bots) : null, m, t),
        });
    }

    return changes;
}

/** The edit with the other side's changes applied: automatic ones, plus the user's picks (theirs only where chosen). */
export function mergeSides(mine: SaleSide, theirs: SaleSide, changes: FieldChange[], picks: Record<string, Pick>): SaleSide {
    const form: SaleForm = { ...mine.form };
    let bots = mine.bots;

    changes.forEach((change) => {
        const take = change.who === 'both' ? (picks[change.key] ?? 'mine') : change.who;

        if (take !== 'theirs') {
            return;
        }

        if (change.key === 'bots') {
            bots = theirs.bots;
        } else {
            (form as Record<FormKey, unknown>)[change.key] = theirs.form[change.key];
        }
    });

    return { form, bots };
}
