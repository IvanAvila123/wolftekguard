<?php

namespace Database\Factories;

use App\Models\Venta;
use App\Models\VentaNota;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VentaNota>
 */
class VentaNotaFactory extends Factory
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
            'texto' => fake()->sentence(),
        ];
    }
}
