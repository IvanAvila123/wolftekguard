<?php

namespace App\Http\Controllers;

use App\Http\Resources\InventarioItemResource;
use App\Http\Resources\MachoteResource;
use App\Http\Resources\VentaResource;
use App\Models\InventarioImportacion;
use App\Models\InventarioItem;
use App\Models\Machote;
use App\Models\Venta;
use App\Models\VentaLinea;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Relations every sale needs for the dashboard, the detail panel and editing.
     *
     * @var list<string>
     */
    private const RELACIONES = ['bots.lineas', 'documentos', 'notasSeguimiento', 'eventos'];

    /** How many archived sales the "Archivadas" dialog lists (the most recently archived). */
    private const ARCHIVADAS_MAX = 50;

    /**
     * Show the WolftekGuard app with the sales of one month, the inventory and the machotes.
     *
     * Every screen route renders this same page; the front-end reads the URL to pick the screen.
     * The month comes from ?mes=YYYY-MM (this month when missing). A linked sale from another
     * month is added so its link still opens; route model binding turns a missing sale into a 404.
     */
    public function __invoke(Request $request, ?Venta $venta = null): Response
    {
        $inicio = $this->mesPedido($request);

        $ventas = Venta::query()
            ->with(self::RELACIONES)
            ->delMes($inicio)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        if ($venta && ! $ventas->contains($venta)) {
            $ventas->push($venta->load(self::RELACIONES));
        }

        return Inertia::render('dashboard', [
            'periodo' => $inicio->format('Y-m'),
            'ventas' => VentaResource::collection($ventas)->resolve(),
            'dnsAbiertos' => $this->dnsAbiertos(),
            'clientes' => $this->clientes(),
            'inventario' => InventarioItemResource::collection(InventarioItem::with('stocks')->orderBy('id')->get())->resolve(),
            'machotes' => MachoteResource::collection(Machote::orderBy('id')->get())->resolve(),
            'ultimaImportacion' => $this->ultimaImportacion(),
            // Only computed when the "Archivadas" dialog asks for it with a partial reload.
            'archivadas' => Inertia::optional(fn () => $this->archivadas()),
        ]);
    }

    /**
     * First day of the month asked for in ?mes=YYYY-MM; this month when it is missing, invalid or in the future.
     */
    private function mesPedido(Request $request): CarbonImmutable
    {
        $actual = CarbonImmutable::now()->startOfMonth();
        $mes = $request->query('mes');

        if (! is_string($mes) || ! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $mes)) {
            return $actual;
        }

        $inicio = CarbonImmutable::createFromFormat('!Y-m', $mes);

        return $inicio->greaterThan($actual) ? $actual : $inicio;
    }

    /**
     * DNs used by open sales of any month, so the form can warn before a DN is sold twice.
     *
     * @return list<array{dn: string, id: int, cliente: string, status: string}>
     */
    private function dnsAbiertos(): array
    {
        return VentaLinea::query()
            ->enVentasAbiertas()
            ->select('venta_lineas.dn', 'ventas.id', 'ventas.razon as cliente', 'ventas.status')
            ->toBase()
            ->get()
            ->map(fn (object $linea) => [
                'dn' => $linea->dn,
                'id' => (int) $linea->id,
                'cliente' => $linea->cliente,
                'status' => $linea->status,
            ])
            ->all();
    }

    /**
     * Known clients grouped by account, with the latest non-empty details of each one,
     * so the new sale form can suggest them whatever month they were sold in.
     *
     * @return list<array{cuenta: string, idcte: string, razon: string, count: int, last: string, lastTipo: string, rfc: string, rl: string, domicilio: string, encargada: string, telefono: string, horario: string}>
     */
    private function clientes(): array
    {
        return Venta::query()
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get(['id', 'cuenta', 'idcte', 'razon', 'tipo', 'fecha', 'rfc', 'rl', 'domicilio', 'encargada', 'telefono', 'horario'])
            ->groupBy('cuenta')
            ->map(function (Collection $ventas): array {
                /** @var Venta $ultima */
                $ultima = $ventas->first();

                $cliente = [
                    'cuenta' => $ultima->cuenta,
                    'idcte' => $ultima->idcte,
                    'razon' => $ultima->razon,
                    'count' => $ventas->count(),
                    'last' => $ultima->etiquetaFecha(),
                    'lastTipo' => $ultima->tipo,
                ];

                foreach (['rfc', 'rl', 'domicilio', 'encargada', 'telefono', 'horario'] as $campo) {
                    $cliente[$campo] = (string) $ventas->first(fn (Venta $venta) => filled($venta->{$campo}))?->{$campo};
                }

                return $cliente;
            })
            ->values()
            ->all();
    }

    /**
     * The most recently archived sales, for the dialog that restores them.
     *
     * @return list<array{id: int, cliente: string, tipo: string, status: string, fecha: string, lineas: int, archivadaAt: string}>
     */
    private function archivadas(): array
    {
        return Venta::onlyTrashed()
            ->withCount('lineas')
            ->orderByDesc('deleted_at')
            ->orderByDesc('id')
            ->limit(self::ARCHIVADAS_MAX)
            ->get()
            ->map(fn (Venta $venta) => [
                'id' => $venta->id,
                'cliente' => $venta->razon,
                'tipo' => $venta->tipo,
                'status' => $venta->status,
                'fecha' => $venta->etiquetaFecha(),
                'lineas' => $venta->lineas_count,
                'archivadaAt' => $venta->deleted_at->toIso8601String(),
            ])
            ->all();
    }

    /**
     * When the inventory was last replaced from Excel, and by whom.
     *
     * @return array{at: string, usuario: ?string, archivo: string}|null
     */
    private function ultimaImportacion(): ?array
    {
        $importacion = InventarioImportacion::with('user')->latest('id')->first();

        return $importacion ? [
            'at' => $importacion->created_at->toIso8601String(),
            'usuario' => $importacion->user?->name,
            'archivo' => $importacion->archivo,
        ] : null;
    }
}
