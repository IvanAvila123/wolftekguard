<?php

namespace App\Models;

use Database\Factories\VentaDocumentoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class VentaDocumento extends Model
{
    /** @use HasFactory<VentaDocumentoFactory> */
    use HasFactory;

    /**
     * Expedientes hold IDs (INE, CURP), so files live on the private disk and are served through an authenticated route.
     */
    public const DISK = 'local';

    /**
     * File types accepted for the required documents (INE, CURP, SAE…): PDFs and photos.
     */
    public const MIMES_EXPEDIENTE = 'pdf,jpg,jpeg,png,webp';

    /**
     * File types accepted in "Otros archivos": also Office files and saved emails.
     */
    public const MIMES_OTROS = 'pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,eml,msg,txt';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'tipo',
        'nombre',
        'path',
        'size',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleted(function (VentaDocumento $documento): void {
            if ($documento->path) {
                Storage::disk(self::DISK)->delete($documento->path);
            }
        });
    }

    /**
     * @return BelongsTo<Venta, $this>
     */
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    /**
     * Label used in the sale's history log.
     */
    public function etiqueta(): string
    {
        return Venta::DOCUMENTOS[$this->tipo] ?? $this->nombre;
    }
}
