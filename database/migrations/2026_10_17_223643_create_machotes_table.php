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
        Schema::create('machotes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cat')->default('General');
            $table->unsignedInteger('uses')->default(0);
            $table->string('preset_status');
            $table->string('preset_prioridad');
            $table->text('text');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machotes');
    }
};
