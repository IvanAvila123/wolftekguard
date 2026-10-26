<?php

namespace Database\Factories;

use App\Models\Venta;
use App\Models\VentaDocumento;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VentaDocumento>
 */
class VentaDocumentoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'venta_id' => Venta::factory(),
            'tipo' => 'ine',
            'nombre' => 'INE.pdf',
            'path' => null,
            'size' => null,
        ];
    }
}
