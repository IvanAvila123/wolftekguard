<?php

namespace App\Models;

use Database\Factories\InventarioImportacionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioImportacion extends Model
{
    /** @use HasFactory<InventarioImportacionFactory> */
    use HasFactory;

    /**
     * Spanish plural (Laravel would guess "inventario_importacions").
     *
     * @var string
     */
    protected $table = 'inventario_importaciones';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'archivo',
        'modelos',
        'nuevos',
        'actualizados',
        'quitados',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
