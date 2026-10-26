<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Índices que faltan por tabla: fecha para el filtro por mes y las
     * llaves foráneas que usa el eager loading (SQLite no las indexa solo).
     *
     * @var array<string, list<list<string>>>
     */
    private array $indices = [
        'ventas' => [['fecha'], ['user_id', 'fecha']],
        'venta_bots' => [['venta_id']],
        'venta_lineas' => [['venta_bot_id']],
        'venta_documentos' => [['venta_id']],
        'venta_notas' => [['venta_id']],
        'venta_eventos' => [['venta_id']],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->indices as $tabla => $listas) {
            Schema::table($tabla, function (Blueprint $table) use ($tabla, $listas) {
                foreach ($listas as $columnas) {
                    if (! Schema::hasIndex($tabla, $columnas)) {
                        $table->index($columnas);
                    }
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->indices as $tabla => $listas) {
            Schema::table($tabla, function (Blueprint $table) use ($tabla, $listas) {
                foreach ($listas as $columnas) {
                    $nombre = $tabla.'_'.implode('_', $columnas).'_index';

                    if (! Schema::hasIndex($tabla, $nombre)) {
                        continue;
                    }

                    // MySQL drops a foreign key's own index once another one starts with the same column
                    // (ventas.user_id), so give that column its index back before dropping the composite.
                    if (count($columnas) > 1 && ! Schema::hasIndex($tabla, [$columnas[0]])) {
                        $table->index([$columnas[0]]);
                    }

                    $table->dropIndex($nombre);
                }
            });
        }
    }
};
