<?php

namespace App\Http\Controllers;

use App\Http\Requests\VentaRequest;
use App\Models\Venta;
use App\Models\VentaBot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VentaController extends Controller
{
    /**
     * Field labels used to describe edits in the sale's history.
     *
     * @var array<string, string>
     */
    private const LABELS = [
        'nombre' => 'nombre',
        'razon' => 'razón social',
        'cuenta' => 'cuenta',
        'idcte' => 'ID CTE',
        'rfc' => 'RFC',
        'rl' => 'representante',
        'acuerdo' => 'acuerdo',
        'fp' => 'FP',
        'domicilio' => 'domicilio',
        'encargada' => 'encargada',
        'telefono' => 'teléfono',
        'horario' => 'horario',
        'tipo' => 'tipo',
        'status' => 'estatus',
        'prioridad' => 'prioridad',
        'cierre' => 'fecha de cierre',
        'notas' => 'notas',
    ];

    /**
     * Store a newly captured sale with its BOTs, DN lines and expediente.
     */
    public function store(VentaRequest $request): RedirectResponse
    {
        $clientUuid = $request->validated('client_uuid');

        // A resend of a sale that already arrived (offline outbox retry): don't create it twice,
        // even if it was archived in the meantime.
        if ($clientUuid && $existing = Venta::withTrashed()->where('client_uuid', $clientUuid)->first()) {
            return $existing->trashed() ? to_route('ventas.index') : to_route('ventas.created', $existing);
        }

        $venta = DB::transaction(function () use ($request, $clientUuid): Venta {
            $venta = Venta::create([
                ...$request->ventaAttributes(),
                'user_id' => $request->user()->id,
                'client_uuid' => $clientUuid,
                'fecha' => now()->toDateString(),
            ]);
            $venta->syncBots($request->bots());
            $venta->moverInventario(null, $request->user());

            foreach ($request->validated('documentos', []) as $index => $documento) {
                $venta->adjuntar($request->file("documentos.{$index}.archivo"), $documento['tipo'], $request->user());
            }

            return $venta;
        });

        return to_route('ventas.created', $venta);
    }

    /**
     * Update a sale and log what changed.
     */
    public function update(VentaRequest $request, Venta $venta): RedirectResponse
    {
        DB::transaction(function () use ($request, $venta): void {
            // Read the sale again, locked until the end of the transaction, so a save arriving
            // at the same moment waits for this one instead of passing the version check too.
            $venta = Venta::query()->lockForUpdate()->findOrFail($venta->id);
            $this->asegurarMismaVersion($venta, $request->versionVista());

            $venta->load('bots.lineas');
            $originalBots = $venta->bots;
            $statusAnterior = $venta->status;
            $bots = $request->bots();

            $venta->fill($request->ventaAttributes());
            $venta->version = $venta->version + 1;
            $changedFields = array_keys(array_filter(
                self::LABELS,
                fn (string $label, string $field) => $venta->isDirty($field),
                ARRAY_FILTER_USE_BOTH,
            ));
            $venta->save();
            $venta->syncBots($bots);

            $quitar = $venta->documentos()->whereIn('id', $request->validated('documentos_quitar', []))->get();
            $quitar->each->delete();
            $nuevos = $request->validated('documentos', []);

            foreach ($nuevos as $index => $documento) {
                $venta->adjuntar($request->file("documentos.{$index}.archivo"), $documento['tipo'], $request->user());
            }

            $changes = $this->describeChanges($venta, $changedFields, $originalBots->all(), $bots, $quitar->isNotEmpty() || $nuevos !== []);
            $venta->registrar($changes ? 'Venta editada: '.implode('; ', $changes) : 'Venta revisada sin cambios', $request->user());
            $venta->moverInventario($statusAnterior, $request->user());
        });

        return to_route('ventas.show', $venta);
    }

    /**
     * Reject an edit made on an older copy of the sale (queued offline or open on another device)
     * instead of silently overwriting what changed since. Edits queued before versions existed
     * send none and are not checked.
     *
     * @throws ValidationException
     */
    private function asegurarMismaVersion(Venta $venta, ?int $versionVista): void
    {
        if ($versionVista !== null && $versionVista !== $venta->version) {
            throw ValidationException::withMessages([
                'version' => 'Esta venta cambió mientras la editabas (en otro equipo o sin conexión). Ábrela de nuevo para ver cómo quedó y vuelve a hacer tus cambios.',
            ]);
        }
    }

    /**
     * Archive a sale. It can be restored from "Archivadas"; its files are kept.
     */
    public function destroy(Request $request, Venta $venta): RedirectResponse
    {
        $venta->archivar($request->user());

        // Back to the sale's month; this month needs no ?mes in the address.
        return to_route('ventas.index', $venta->fecha->isCurrentMonth() ? [] : ['mes' => $venta->fecha->format('Y-m')]);
    }

    /**
     * Restore an archived sale and open it. Restoring one that is not archived does nothing
     * (an offline resend), so its pieces are never taken twice.
     *
     * @throws ValidationException
     */
    public function restore(Request $request, Venta $venta): RedirectResponse
    {
        if ($venta->trashed()) {
            $abierta = ! in_array($venta->status, Venta::STATUSES_CERRADOS, true);

            if ($abierta && $ocupado = $venta->dnOcupadoPorOtraVenta()) {
                throw ValidationException::withMessages([
                    'venta' => "No se puede restaurar: el DN {$ocupado->dn} ya está en otra venta abierta: {$ocupado->razon} ({$ocupado->status}).",
                ]);
            }

            $venta->restaurar($request->user());
        }

        return to_route('ventas.show', $venta);
    }

    /**
     * Human summary of an edit, in the order the sales team reads it.
     *
     * @param  list<string>  $changedFields
     * @param  list<VentaBot>  $originalBots
     * @param  list<array{costo: bool, equipo: string, sku: string, plan: string, plazo: string, proteccion: bool, dmr: string, redes: string, dns: list<string>}>  $bots
     * @return list<string>
     */
    private function describeChanges(Venta $venta, array $changedFields, array $originalBots, array $bots, bool $documentosChanged): array
    {
        $changes = [];

        if (in_array('acuerdo', $changedFields, true)) {
            $changes[] = 'acuerdo → '.($venta->acuerdo ?: '—');
        }

        if (in_array('status', $changedFields, true)) {
            $changes[] = 'estatus → '.$venta->status;
        }

        $rest = array_values(array_diff($changedFields, ['acuerdo', 'status']));

        if ($rest !== []) {
            $changes[] = 'se actualizó '.implode(', ', array_map(fn (string $field) => self::LABELS[$field], $rest));
        }

        foreach ($bots as $i => $bot) {
            $n = $i + 1;
            $original = $originalBots[$i] ?? null;

            if (! $original) {
                $changes[] = 'se agregó BOT '.$n;

                continue;
            }

            if ($original->sku !== $bot['sku']) {
                $changes[] = 'BOT '.$n.': '.$this->equipoLabel($original->equipo).' → '.$this->equipoLabel($bot['equipo']);
            }

            if ($original->lineas->count() !== count($bot['dns'])) {
                $changes[] = 'BOT '.$n.': '.$original->lineas->count().' → '.count($bot['dns']).' líneas';
            }
        }

        if ($documentosChanged) {
            $changes[] = 'expediente actualizado';
        }

        if (count($originalBots) > count($bots)) {
            $changes[] = 'se quitaron '.(count($originalBots) - count($bots)).' BOT';
        }

        return $changes;
    }

    private function equipoLabel(string $equipo): string
    {
        if ($equipo === '') {
            return 'sin equipo';
        }

        return preg_replace('/ ATT$/', '', $equipo);
    }
}
