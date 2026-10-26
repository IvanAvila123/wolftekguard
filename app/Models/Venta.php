<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\VentaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Venta extends Model
{
    /** @use HasFactory<VentaFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Sale statuses, in the order the dashboard funnel shows them.
     *
     * @var list<string>
     */
    public const STATUSES = [
        'En Proceso',
        'Captura',
        'Reingreso',
        'Líneas Atrapadas',
        'No Avanzó a Crédito',
        'Rechazada',
        'Cancelada',
        'Terminado',
    ];

    /**
     * Statuses that close a sale: its DNs are free to be sold again.
     *
     * @var list<string>
     */
    public const STATUSES_CERRADOS = ['Rechazada', 'Cancelada', 'Terminado'];

    /** The status in which the equipment was delivered: its pieces leave the inventory. */
    public const STATUS_TERMINADO = 'Terminado';

    /** @var list<string> */
    public const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

    /**
     * Required expediente documents; anything else is filed under "otros".
     *
     * @var array<string, string>
     */
    public const DOCUMENTOS = [
        'ine' => 'INE',
        'sae' => 'Formato SAE',
        'curp' => 'CURP',
        'modelo' => 'Modelo financiero',
        'oc' => 'OC',
        'op' => 'OP',
    ];

    public const DOCUMENTO_OTROS = 'otros';

    /**
     * Short Spanish month names used in the sale date label ("15 oct 2026").
     *
     * @var list<string>
     */
    private const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'client_uuid',
        'nombre',
        'razon',
        'cuenta',
        'idcte',
        'rfc',
        'rl',
        'acuerdo',
        'fp',
        'domicilio',
        'encargada',
        'telefono',
        'horario',
        'tipo',
        'status',
        'prioridad',
        'cierre',
        'notas',
        'meses',
        'fecha',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meses' => 'array',
            'fecha' => 'date',
            'version' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<VentaBot, $this>
     */
    public function bots(): HasMany
    {
        return $this->hasMany(VentaBot::class)->orderBy('posicion');
    }

    /**
     * @return HasManyThrough<VentaLinea, VentaBot, $this>
     */
    public function lineas(): HasManyThrough
    {
        return $this->hasManyThrough(VentaLinea::class, VentaBot::class);
    }

    /**
     * @return HasMany<VentaDocumento, $this>
     */
    public function documentos(): HasMany
    {
        return $this->hasMany(VentaDocumento::class)->orderBy('id');
    }

    /**
     * @return HasMany<VentaNota, $this>
     */
    public function notasSeguimiento(): HasMany
    {
        return $this->hasMany(VentaNota::class)->latest('id');
    }

    /**
     * @return HasMany<VentaEvento, $this>
     */
    public function eventos(): HasMany
    {
        return $this->hasMany(VentaEvento::class)->latest('id');
    }

    /**
     * Sales dated in the month that starts on $inicio.
     *
     * A date range (not whereMonth) so the query can use the fecha index.
     *
     * @param  Builder<Venta>  $query
     */
    public function scopeDelMes(Builder $query, CarbonInterface $inicio): void
    {
        $desde = $inicio->copy()->startOfMonth();

        $query->where('fecha', '>=', $desde)->where('fecha', '<', $desde->copy()->addMonth());
    }

    /**
     * Sales that are still in progress (not rejected, cancelled or finished).
     *
     * @param  Builder<Venta>  $query
     */
    public function scopeAbiertas(Builder $query): void
    {
        $query->whereNotIn('status', self::STATUSES_CERRADOS);
    }

    /**
     * Which of the given DNs another open sale already has, keyed by DN with that sale's client and status.
     *
     * @param  iterable<string>  $dns
     * @return Collection<string, object{dn: string, razon: string, status: string}>
     */
    public static function dnsEnOtraVentaAbierta(iterable $dns, ?int $exceptoVentaId = null): Collection
    {
        return VentaLinea::query()
            ->enVentasAbiertas()
            ->whereIn('venta_lineas.dn', collect($dns)->all())
            ->when($exceptoVentaId, fn (Builder $query, int $id) => $query->where('ventas.id', '!=', $id))
            ->toBase()
            ->get(['venta_lineas.dn', 'ventas.razon', 'ventas.status'])
            ->keyBy('dn');
    }

    /**
     * The sale date as the app shows it, e.g. "15 oct 2026".
     */
    public function etiquetaFecha(): string
    {
        return $this->fecha->day.' '.self::MESES[$this->fecha->month - 1].' '.$this->fecha->year;
    }

    /**
     * @return HasMany<InventarioMovimiento, $this>
     */
    public function movimientos(): HasMany
    {
        return $this->hasMany(InventarioMovimiento::class);
    }

    /**
     * The first of this sale's DNs that another open sale already has, if any.
     *
     * @return object{dn: string, razon: string, status: string}|null
     */
    public function dnOcupadoPorOtraVenta(): ?object
    {
        return self::dnsEnOtraVentaAbierta($this->lineas()->pluck('dn'), $this->id)->first();
    }

    /**
     * Archive the sale (soft delete): it leaves the lists, frees its DNs and,
     * if it was Terminado, gives its pieces back to the inventory.
     */
    public function archivar(?User $user = null): void
    {
        DB::transaction(function () use ($user): void {
            if ($this->status === self::STATUS_TERMINADO) {
                $this->regresarInventario($user);
            }

            $this->registrar('Venta archivada', $user);
            $this->delete();
        });
    }

    /**
     * Bring an archived sale back; a Terminado one takes its pieces again.
     * Check dnOcupadoPorOtraVenta() first: an open sale can't come back with a DN another one has now.
     */
    public function restaurar(?User $user = null): void
    {
        DB::transaction(function () use ($user): void {
            $this->restore();
            $this->registrar('Venta restaurada', $user);

            if ($this->status === self::STATUS_TERMINADO) {
                $this->descontarInventario($user);
            }
        });
    }

    /**
     * Take the sale's equipment out of the inventory when it becomes Terminado,
     * and give it back when it stops being Terminado.
     */
    public function moverInventario(?string $statusAnterior, ?User $user = null): void
    {
        $estaba = $statusAnterior === self::STATUS_TERMINADO;
        $esta = $this->status === self::STATUS_TERMINADO;

        if ($estaba === $esta) {
            return;
        }

        DB::transaction(fn () => $esta ? $this->descontarInventario($user) : $this->regresarInventario($user));
    }

    /**
     * One piece per DN (at least one per BOT), taken from the warehouses with the most stock first.
     * Missing pieces are only noted: the sale was allowed to be saved without enough stock.
     */
    private function descontarInventario(?User $user): void
    {
        $piezasPorSku = $this->bots()->with('lineas')->get()
            ->groupBy('sku')
            ->map(fn ($bots) => $bots->sum(fn (VentaBot $bot) => max(1, $bot->lineas->count())));

        $descontadas = 0;
        $faltantes = 0;

        foreach ($piezasPorSku as $sku => $piezas) {
            $stocks = InventarioStock::query()
                ->whereRelation('item', 'sku', $sku)
                ->where('cantidad', '>', 0)
                ->orderByDesc('cantidad')
                ->lockForUpdate()
                ->get();

            foreach ($stocks as $stock) {
                $toma = min($piezas, $stock->cantidad);
                $stock->decrement('cantidad', $toma);
                $this->movimientos()->create(['sku' => $sku, 'almacen' => $stock->almacen, 'cantidad' => $toma]);
                $descontadas += $toma;
                $piezas -= $toma;

                if ($piezas === 0) {
                    break;
                }
            }

            $faltantes += $piezas;
        }

        if ($descontadas + $faltantes === 0) {
            return;
        }

        $this->registrar(
            "Inventario: se descontaron {$descontadas} equipos".($faltantes ? " ({$faltantes} sin stock)" : ''),
            $user,
        );
    }

    /**
     * Give back the pieces taken since the last Excel import. Older ones are not returned:
     * that import already came with them discounted.
     */
    private function regresarInventario(?User $user): void
    {
        $regresadas = 0;

        foreach ($this->movimientos()->whereNull('absorbido_at')->get() as $movimiento) {
            $item = InventarioItem::firstWhere('sku', $movimiento->sku);

            if ($item) {
                $item->stocks()->firstOrCreate(['almacen' => $movimiento->almacen], ['cantidad' => 0])->increment('cantidad', $movimiento->cantidad);
                $regresadas += $movimiento->cantidad;
            }
        }

        $this->movimientos()->delete();

        if ($regresadas > 0) {
            $this->registrar("Inventario: se regresaron {$regresadas} equipos", $user);
        }
    }

    /**
     * Record an entry in the sale's history log.
     */
    public function registrar(string $texto, ?User $user = null): VentaEvento
    {
        return $this->eventos()->create(['texto' => $texto, 'user_id' => $user?->id]);
    }

    /**
     * Replace the sale's BOTs and their DN lines.
     *
     * @param  list<array{costo: bool, equipo: string, sku: string, plan: string, plazo: string, proteccion: bool, dmr: string, redes: string, dns: list<string>}>  $bots
     */
    public function syncBots(array $bots): void
    {
        $this->bots()->delete();

        foreach (array_values($bots) as $posicion => $bot) {
            $dns = $bot['dns'];
            unset($bot['dns']);

            $this->bots()
                ->create([...$bot, 'posicion' => $posicion])
                ->lineas()
                ->createMany(array_map(fn (string $dn, int $i) => ['posicion' => $i, 'dn' => $dn], $dns, array_keys($dns)));
        }

        $this->unsetRelation('bots');
    }

    /**
     * Store an uploaded file in the expediente; a required document replaces the previous one of its type.
     */
    public function adjuntar(UploadedFile $archivo, string $tipo, ?User $user = null): VentaDocumento
    {
        if ($tipo !== self::DOCUMENTO_OTROS) {
            $this->documentos()->where('tipo', $tipo)->get()->each->delete();
        }

        return $this->documentos()->create([
            'user_id' => $user?->id,
            'tipo' => $tipo,
            'nombre' => $archivo->getClientOriginalName(),
            'path' => $archivo->store('expedientes/'.$this->id, VentaDocumento::DISK),
            'size' => $archivo->getSize(),
        ]);
    }
}
