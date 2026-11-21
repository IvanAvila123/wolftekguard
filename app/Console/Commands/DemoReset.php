<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

/**
 * Borra la base de datos y vuelve a cargar los datos de ejemplo.
 * Pensado para una tarea programada:  php artisan demo:reset
 * Solo funciona con DEMO_MODE=true, para que nunca se corra en producción.
 */
class DemoReset extends Command
{
    protected $signature = 'demo:reset';

    protected $description = 'Reinicia la base de datos del demo con los datos de ejemplo (solo con DEMO_MODE=true)';

    public function handle(): int
    {
        if (! config('demo.enabled')) {
            $this->error('DEMO_MODE no está activo. No se reinició nada.');

            return self::FAILURE;
        }

        $started = microtime(true);

        if (config('database.default') === 'sqlite') {
            $db = config('database.connections.sqlite.database');
            if ($db && $db !== ':memory:' && ! File::exists($db)) {
                File::ensureDirectoryExists(dirname($db));
                File::put($db, '');
            }
        }

        $steps = [
            ['migrate:fresh', ['--force' => true]],
            ['db:seed', ['--class' => config('demo.seeder'), '--force' => true]],
        ];
        foreach (config('demo.after_reset') as $command) {
            $steps[] = [trim($command), []];
        }

        foreach ($steps as [$command, $options]) {
            if (Artisan::call($command, $options) !== self::SUCCESS) {
                $this->error("Falló: {$command}");
                $this->line(Artisan::output());

                return self::FAILURE;
            }
        }

        // Archivos que subieron los visitantes.
        foreach (['livewire-tmp', 'demo-uploads'] as $dir) {
            File::deleteDirectory(storage_path("app/{$dir}"));
        }

        Artisan::call('optimize:clear');

        $this->info(sprintf('Demo reiniciado en %.1f s.', microtime(true) - $started));

        return self::SUCCESS;
    }
}
