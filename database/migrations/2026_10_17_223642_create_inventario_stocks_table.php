<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('inventario_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_item_id')->constrained()->cascadeOnDelete();
            $table->string('almacen');
            $table->unsignedInteger('cantidad')->default(0);
            $table->timestamps();

            $table->unique(['inventario_item_id', 'almacen']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventario_stocks');
    }
};
