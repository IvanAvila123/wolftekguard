<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The inventory Excel can bring any columns: number columns are warehouses (inventario_stocks
     * already stores them by name) and text columns are extra details kept on each item. Each import
     * remembers its columns so the screen shows them in the file's order.
     */
    public function up(): void
    {
        Schema::table('inventario_items', function (Blueprint $table) {
            $table->json('extras')->nullable();
        });

        Schema::table('inventario_importaciones', function (Blueprint $table) {
            $table->json('columnas')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventario_items', function (Blueprint $table) {
            $table->dropColumn('extras');
        });

        Schema::table('inventario_importaciones', function (Blueprint $table) {
            $table->dropColumn('columnas');
        });
    }
};
