<?php

namespace Database\Factories;

use App\Models\Machote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Machote>
 */
class MachoteFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => strtoupper(fake()->words(2, true)),
            'cat' => 'General',
            'uses' => 0,
            'preset_status' => 'Captura',
            'preset_prioridad' => 'Media',
            'text' => "Buen día\n\nCLIENTE: {CLIENTE}\nCUENTA: {CUENTA}",
        ];
    }
}
