<?php

namespace App\Http\Resources;

use App\Models\Venta;
use App\Models\VentaBot;
use App\Models\VentaDocumento;
use App\Models\VentaEvento;
use App\Models\VentaLinea;
use App\Models\VentaNota;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Venta
 */
class VentaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente' => $this->razon,
            'tipo' => $this->tipo,
            'cuenta' => $this->cuenta,
            'idcte' => $this->idcte,
            'lineas' => $this->bots->sum(fn (VentaBot $bot) => $bot->lineas->count()),
            'acuerdo' => $this->acuerdo,
            'fecha' => $this->etiquetaFecha(),
            'periodo' => $this->fecha->format('Y-m'),
            'prioridad' => $this->prioridad,
            'status' => $this->status,
            'version' => $this->version,
            'form' => [
                'nombre' => $this->nombre,
                'razon' => $this->razon,
                'cuenta' => $this->cuenta,
                'idcte' => $this->idcte,
                'rfc' => $this->rfc,
                'rl' => $this->rl,
                'acuerdo' => $this->acuerdo,
                'fp' => $this->fp,
                'domicilio' => (string) $this->domicilio,
                'encargada' => $this->encargada,
                'telefono' => $this->telefono,
                'horario' => $this->horario,
                'tipo' => $this->tipo,
                'status' => $this->status,
                'prioridad' => $this->prioridad,
                'cierre' => $this->cierre,
                'notas' => (string) $this->notas,
                'meses' => $this->meses ?? [],
            ],
            'bots' => $this->bots->map(fn (VentaBot $bot) => [
                'costo' => $bot->costo,
                'equipo' => $bot->equipo,
                'sku' => $bot->sku,
                'plan' => $bot->plan,
                'plazo' => $bot->plazo,
                'proteccion' => $bot->proteccion,
                'dmr' => $bot->dmr,
                'redes' => $bot->redes,
                'dns' => $bot->lineas->map(fn (VentaLinea $linea) => $linea->dn)->all(),
            ])->all(),
            'documentos' => $this->documentos->map(fn (VentaDocumento $documento) => [
                'id' => $documento->id,
                'tipo' => $documento->tipo,
                'name' => $documento->nombre,
                'size' => $documento->size,
                'at' => $documento->created_at?->toIso8601String(),
                'archivado' => $documento->path === null,
                'url' => $documento->path ? route('ventas.documentos.show', [$this->id, $documento->id]) : null,
            ])->all(),
            'log' => $this->eventos->map(fn (VentaEvento $evento) => ['t' => $evento->texto, 'at' => $evento->created_at?->toIso8601String()])->all(),
            'notes' => $this->notasSeguimiento->map(fn (VentaNota $nota) => ['t' => $nota->texto, 'at' => $nota->created_at?->toIso8601String()])->all(),
        ];
    }
}
