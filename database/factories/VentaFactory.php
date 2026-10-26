<?php

namespace Database\Factories;

use App\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Venta>
 */
class VentaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $razon = strtoupper(fake()->company());
        $tipo = fake()->randomElement(['RENOVACION', 'LINEA NUEVA', 'PORTABILIDAD', 'AUMENTO DE LINEAS']);

        return [
            'nombre' => $tipo.' - '.$razon,
            'razon' => $razon,
            'cuenta' => fake()->numerify('50#######'),
            'idcte' => fake()->numerify('105######'),
            'rfc' => '',
            'rl' => strtoupper(fake()->name()),
            'acuerdo' => fake()->numerify('4080####'),
            'fp' => '',
            'domicilio' => '',
            'encargada' => '',
            'telefono' => fake()->numerify('##########'),
            'horario' => 'DE 9:00 A 18:00 HRS',
            'tipo' => $tipo,
            'status' => 'Captura',
            'prioridad' => fake()->randomElement(Venta::PRIORIDADES),
            'cierre' => '',
            'notas' => null,
            'meses' => [],
            'fecha' => now()->toDateString(),
        ];
    }

    /**
     * Indicate the sale is in the given status.
     */
    public function status(string $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
        ]);
    }
}
