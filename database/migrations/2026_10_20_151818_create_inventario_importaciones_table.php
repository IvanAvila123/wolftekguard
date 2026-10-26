<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * One row per Excel import that replaced the inventory: who did it, from which file and what changed.
     */
    public function up(): void
    {
        Schema::create('inventario_importaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('archivo');
            $table->unsignedInteger('modelos');
            $table->unsignedInteger('nuevos');
            $table->unsignedInteger('actualizados');
            $table->unsignedInteger('quitados');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventario_importaciones');
    }
};
