<?php

namespace Database\Factories;

use App\Models\Venta;
use App\Models\VentaBot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VentaBot>
 */
class VentaBotFactory extends Factory
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
            'posicion' => 0,
            'costo' => true,
            'equipo' => 'HONOR X5D MIDNIGTH BLACK ATT',
            'sku' => 'N.HOX5DMN',
            'plan' => 'ATTv2 ArmaloNEG 299 C',
            'plazo' => '24 meses',
            'proteccion' => false,
            'dmr' => '',
            'redes' => '',
        ];
    }

    /**
     * Give the BOT the given DN lines.
     *
     * @param  list<string>  $dns
     */
    public function withDns(array $dns): static
    {
        return $this->afterCreating(function (VentaBot $bot) use ($dns): void {
            $bot->lineas()->createMany(collect($dns)->map(fn (string $dn, int $i) => ['posicion' => $i, 'dn' => $dn])->all());
        });
    }
}
