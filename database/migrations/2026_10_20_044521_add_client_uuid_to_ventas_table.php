<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The browser generates this id when a sale is saved. If the same sale is sent again
     * (e.g. resent from the offline outbox), the server finds it instead of creating a duplicate.
     */
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropUnique(['client_uuid']);
            $table->dropColumn('client_uuid');
        });
    }
};
