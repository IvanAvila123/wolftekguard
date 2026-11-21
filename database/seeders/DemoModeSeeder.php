<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Venta;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Datos de ejemplo para el modo demo (php artisan demo:reset).
 * Reutiliza los seeders del proyecto y mueve las fechas de las ventas a los
 * últimos días, para que el dashboard del mes actual siempre tenga datos.
 */
class DemoModeSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name' => 'Usuario Demo',
            'email' => config('demo.login'),
            'password' => config('demo.password'),
        ]);

        $this->call([
            InventarioItemSeeder::class,
            MachoteSeeder::class,
            VentaSeeder::class,
        ]);

        // Todo lo sembrado queda a nombre del usuario demo.
        foreach (Schema::getTableListing() as $table) {
            $table = str_contains($table, '.') ? substr($table, strrpos($table, '.') + 1) : $table;
            if ($table !== 'users' && Schema::hasColumn($table, 'user_id')) {
                DB::table($table)->whereNull('user_id')->update(['user_id' => $user->id]);
            }
        }

        // Recorre las fechas para que la venta más reciente sea de ayer.
        $latest = Venta::withTrashed()->max('created_at');
        if ($latest) {
            $shift = (int) Carbon::parse($latest)->startOfDay()->diffInDays(now()->subDay()->startOfDay(), false);
            Venta::withTrashed()->get()->each(function (Venta $venta) use ($shift) {
                $venta->timestamps = false;
                $venta->forceFill([
                    'created_at' => Carbon::parse($venta->created_at)->addDays($shift),
                    'updated_at' => Carbon::parse($venta->updated_at)->addDays($shift),
                    'fecha' => $venta->fecha ? Carbon::parse($venta->fecha)->addDays($shift)->toDateString() : null,
                ])->saveQuietly();
            });
        }
    }
}
