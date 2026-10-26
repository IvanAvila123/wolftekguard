<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily backup of the database and expedientes (needs the scheduler's cron entry on the server).
Schedule::command('wolftek:respaldo')
    ->dailyAt(config('wolftek.respaldos.hora'))
    ->withoutOverlapping()
    ->onFailure(fn () => Log::error('El respaldo diario de WolftekGuard falló. Revisa: php artisan wolftek:respaldo'));
