<?php

namespace Database\Seeders;

use App\Models\Machote;
use Illuminate\Database\Seeder;

class MachoteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Machote::updateOrCreate(['name' => 'LINEAS ATRAPADAS'], [
            'cat' => 'IT',
            'uses' => 37,
            'preset_status' => 'Líneas Atrapadas',
            'preset_prioridad' => 'Alta',
            'text' => "APOYO CON LIBERACION DN | {CF} | {ID CTE} | {RAZON SOCIAL} | {NUMERO DE LINEAS}\n\nBuen Dia!!\n\nPor favor me podrías ayudar con la liberación del siguiente DN\nen espera de sus indicaciones gracias\n\nCLIENTE: {CLIENTE}\nCUENTA: {CUENTA}\nID CTE: {ID CTE}\nACUERDO: {ACUERDO}\nLínea: {DN}",
        ]);

        Machote::updateOrCreate(['name' => 'Venta General'], [
            'cat' => 'General',
            'uses' => 112,
            'preset_status' => 'Captura',
            'preset_prioridad' => 'Media',
            'text' => "Buen Dia\nMe ayudan con esta orden por favor\n\nsaludos!\n\nFolio de contrato: {FOLIO}\n\nPD: FAVOR DE INDICAR SI EL CLIENTE VA PAGAR EL MPE",
        ]);
    }
}
