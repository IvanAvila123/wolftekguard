<?php

namespace Database\Factories;

use App\Models\InventarioImportacion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventarioImportacion>
 */
class InventarioImportacionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'archivo' => 'inventario-'.fake()->date('Y-m-d').'.xlsx',
            'modelos' => fake()->numberBetween(10, 40),
            'nuevos' => fake()->numberBetween(0, 5),
            'actualizados' => fake()->numberBetween(0, 20),
            'quitados' => fake()->numberBetween(0, 3),
        ];
    }
}
