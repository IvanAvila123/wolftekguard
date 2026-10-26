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
        Schema::create('venta_bots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('posicion');
            $table->boolean('costo')->default(true);
            $table->string('equipo')->default('');
            $table->string('sku')->default('');
            $table->string('plan')->default('');
            $table->string('plazo')->default('');
            $table->boolean('proteccion')->default(false);
            $table->string('dmr')->default('');
            $table->string('redes')->default('');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('venta_bots');
    }
};
