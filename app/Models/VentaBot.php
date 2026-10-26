<?php

namespace App\Models;

use Database\Factories\VentaBotFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VentaBot extends Model
{
    /** @use HasFactory<VentaBotFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'posicion',
        'costo',
        'equipo',
        'sku',
        'plan',
        'plazo',
        'proteccion',
        'dmr',
        'redes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'costo' => 'boolean',
            'proteccion' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Venta, $this>
     */
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * The DN lines sold in this BOT.
     *
     * @return HasMany<VentaLinea, $this>
     */
    public function lineas(): HasMany
    {
        return $this->hasMany(VentaLinea::class)->orderBy('posicion');
    }
}
