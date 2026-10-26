<?php

namespace App\Models;

use Database\Factories\InventarioItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventarioItem extends Model
{
    /** @use HasFactory<InventarioItemFactory> */
    use HasFactory;

    /**
     * Warehouses stock is tracked in.
     *
     * @var list<string>
     */
    public const ALMACENES = ['EBS_MEX', 'EBS_GDL', 'EBS_MTY'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'oem',
        'sku',
        'nombre',
        'modelo',
        'color',
    ];

    /**
     * @return HasMany<InventarioStock, $this>
     */
    public function stocks(): HasMany
    {
        return $this->hasMany(InventarioStock::class);
    }

    /**
     * Pieces available in one warehouse.
     */
    public function stockEn(string $almacen): int
    {
        return (int) $this->stocks->firstWhere('almacen', $almacen)?->cantidad;
    }

    /**
     * Pieces across every warehouse.
     */
    public function stockTotal(): int
    {
        return array_sum(array_map(fn (string $almacen) => $this->stockEn($almacen), self::ALMACENES));
    }

    /**
     * What replacing the inventory with these file rows would change.
     *
     * @param  list<array{oem: string, sku: string, nombre: string, modelo: ?string, color: ?string, stock: array<string, int>}>  $filas
     * @return array{nuevos: list<array<string, mixed>>, cambian: list<array<string, mixed>>, sinStock: list<array<string, mixed>>, quitados: list<array<string, mixed>>, sinCambios: int}
     */
    public static function compararCon(array $filas): array
    {
        $actuales = self::with('stocks')->get()->keyBy('sku');
        $resultado = ['nuevos' => [], 'cambian' => [], 'sinStock' => [], 'quitados' => [], 'sinCambios' => 0];

        foreach ($filas as $fila) {
            $despues = array_sum($fila['stock']);
            $item = $actuales->get($fila['sku']);

            if (! $item) {
                $resultado['nuevos'][] = ['sku' => $fila['sku'], 'nombre' => $fila['nombre'], 'total' => $despues];

                continue;
            }

            $antes = $item->stockTotal();
            $cambioStock = collect(self::ALMACENES)->contains(fn (string $almacen) => $item->stockEn($almacen) !== $fila['stock'][$almacen]);
            $cambioDatos = $item->nombre !== $fila['nombre'] || $item->oem !== $fila['oem']
                || ($fila['modelo'] !== null && $item->modelo !== $fila['modelo'])
                || ($fila['color'] !== null && $item->color !== $fila['color']);

            if ($despues === 0 && $antes > 0) {
                $resultado['sinStock'][] = ['sku' => $fila['sku'], 'nombre' => $fila['nombre'], 'antes' => $antes];
            } elseif ($cambioStock || $cambioDatos) {
                $resultado['cambian'][] = ['sku' => $fila['sku'], 'nombre' => $fila['nombre'], 'antes' => $antes, 'despues' => $despues];
            } else {
                $resultado['sinCambios']++;
            }
        }

        $enArchivo = array_flip(array_column($filas, 'sku'));

        foreach ($actuales as $sku => $item) {
            if (! isset($enArchivo[$sku])) {
                $resultado['quitados'][] = ['sku' => $sku, 'nombre' => $item->nombre, 'total' => $item->stockTotal()];
            }
        }

        return $resultado;
    }

    /**
     * Replace the whole inventory with these file rows: update what exists, add what is new and
     * remove what the file no longer lists. Model and color are kept when the file leaves them out.
     *
     * @param  list<array{oem: string, sku: string, nombre: string, modelo: ?string, color: ?string, stock: array<string, int>}>  $filas
     */
    public static function reemplazarCon(array $filas): void
    {
        $actuales = self::query()->get()->keyBy('sku');

        // The Excel already has the finished sales discounted: their movements can no longer be returned.
        InventarioMovimiento::whereNull('absorbido_at')->update(['absorbido_at' => now()]);

        self::query()->whereNotIn('sku', array_column($filas, 'sku'))->delete();

        foreach ($filas as $fila) {
            $item = $actuales->get($fila['sku']) ?? new self(['sku' => $fila['sku']]);
            $item->fill([
                'oem' => $fila['oem'],
                'nombre' => $fila['nombre'],
                'modelo' => $fila['modelo'] ?? ($item->exists ? $item->modelo : $fila['nombre']),
                'color' => $fila['color'] ?? ($item->exists ? $item->color : ''),
            ])->save();

            foreach ($fila['stock'] as $almacen => $cantidad) {
                $item->stocks()->updateOrCreate(['almacen' => $almacen], ['cantidad' => $cantidad]);
            }
        }
    }
}
