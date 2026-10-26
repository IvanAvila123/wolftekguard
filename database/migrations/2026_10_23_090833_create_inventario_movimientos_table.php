<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pieces a finished sale took from each warehouse, so they can be returned exactly.
     * SKU and warehouse are plain text because an Excel import may delete the item.
     */
    public function up(): void
    {
        Schema::create('inventario_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->index()->constrained()->cascadeOnDelete();
            $table->string('sku');
            $table->string('almacen');
            $table->unsignedInteger('cantidad');
            $table->timestamp('absorbido_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventario_movimientos');
    }
};
