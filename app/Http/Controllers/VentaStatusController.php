<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VentaStatusController extends Controller
{
    /**
     * Change a sale's status from the sale drawer.
     */
    public function __invoke(Request $request, Venta $venta): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Venta::STATUSES)],
            // The status the user saw when changing it; lets a change queued offline detect it is stale.
            'status_anterior' => ['nullable', Rule::in(Venta::STATUSES)],
        ]);

        DB::transaction(function () use ($venta, $validated, $request): void {
            $venta = Venta::query()->lockForUpdate()->findOrFail($venta->id);

            // Already in that status (the same change sent twice): nothing to do.
            if ($venta->status === $validated['status']) {
                return;
            }

            $this->asegurarQueNoCambio($venta, $validated['status_anterior'] ?? null);
            $this->asegurarDnsLibres($venta, $validated['status']);

            $statusAnterior = $venta->status;
            $venta->status = $validated['status'];
            $venta->version = $venta->version + 1;
            $venta->save();
            $venta->registrar('Estatus cambiado a '.$venta->status, $request->user());
            $venta->moverInventario($statusAnterior, $request->user());
        });

        return back();
    }

    /**
     * A status change made while seeing an older status (queued offline, another device) is
     * rejected instead of undoing whatever changed it meanwhile.
     *
     * @throws ValidationException
     */
    private function asegurarQueNoCambio(Venta $venta, ?string $statusVisto): void
    {
        if ($statusVisto !== null && $statusVisto !== $venta->status) {
            throw ValidationException::withMessages([
                'status' => "El estatus de esta venta ya había cambiado a {$venta->status} (en otro equipo o sin conexión). Revísalo antes de cambiarlo.",
            ]);
        }
    }

    /**
     * Reopening a closed sale must not leave one of its DNs in two open sales.
     *
     * @throws ValidationException
     */
    private function asegurarDnsLibres(Venta $venta, string $status): void
    {
        $reabre = in_array($venta->status, Venta::STATUSES_CERRADOS, true) && ! in_array($status, Venta::STATUSES_CERRADOS, true);

        if (! $reabre) {
            return;
        }

        $ocupado = $venta->dnOcupadoPorOtraVenta();

        if ($ocupado) {
            throw ValidationException::withMessages([
                'status' => "No se puede reabrir: el DN {$ocupado->dn} ya está en otra venta abierta: {$ocupado->razon} ({$ocupado->status}).",
            ]);
        }
    }
}
