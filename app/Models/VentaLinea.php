<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentaLinea extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'posicion',
        'dn',
    ];

    /**
     * Lines of open, not archived sales, joined with their sale so its id, client and status can be selected.
     *
     * @param  Builder<VentaLinea>  $query
     */
    public function scopeEnVentasAbiertas(Builder $query): void
    {
        $query->join('venta_bots', 'venta_bots.id', '=', 'venta_lineas.venta_bot_id')
            ->join('ventas', 'ventas.id', '=', 'venta_bots.venta_id')
            ->whereNull('ventas.deleted_at')
            ->whereNotIn('ventas.status', Venta::STATUSES_CERRADOS);
    }

    /**
     * @return BelongsTo<VentaBot, $this>
     */
    public function bot(): BelongsTo
    {
        return $this->belongsTo(VentaBot::class, 'venta_bot_id');
    }
}
