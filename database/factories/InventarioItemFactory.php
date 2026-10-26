<?php

namespace Database\Factories;

use App\Models\InventarioItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventarioItem>
 */
class InventarioItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $modelo = strtoupper(fake()->word()).' '.fake()->randomElement(['64GB', '128GB', '256GB']);
        $color = strtoupper(fake()->safeColorName());

        return [
            'oem' => fake()->randomElement(['APPLE', 'SAMSUNG', 'MOTOROLA', 'HONOR']),
            'sku' => 'N.'.strtoupper(fake()->unique()->bothify('??###??')),
            'nombre' => $modelo.' '.$color.' ATT',
            'modelo' => $modelo,
            'color' => $color,
        ];
    }

    /**
     * Give the item these pieces per warehouse.
     *
     * @param  array<string, int>  $stock
     */
    public function withStock(array $stock): static
    {
        return $this->afterCreating(function (InventarioItem $item) use ($stock): void {
            foreach ($stock as $almacen => $cantidad) {
                $item->stocks()->create(['almacen' => $almacen, 'cantidad' => $cantidad]);
            }
        });
    }
}
