<?php

namespace Database\Factories;

use App\Models\Venta;
use App\Models\VentaEvento;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VentaEvento>
 */
class VentaEventoFactory extends Factory
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
            'texto' => 'Venta capturada',
        ];
    }
}
