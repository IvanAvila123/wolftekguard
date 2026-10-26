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
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('nombre');
            $table->string('razon');
            $table->string('cuenta', 9)->index();
            $table->string('idcte', 9)->index();
            $table->string('rfc', 13)->default('');
            $table->string('rl')->default('');
            $table->string('acuerdo')->default('');
            $table->string('fp')->default('');
            $table->text('domicilio')->nullable();
            $table->string('encargada')->default('');
            $table->string('telefono', 10)->default('');
            $table->string('horario')->default('');
            $table->string('tipo');
            $table->string('status')->index();
            $table->string('prioridad');
            $table->string('cierre')->default('');
            $table->text('notas')->nullable();
            $table->json('meses')->nullable();
            $table->date('fecha');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
