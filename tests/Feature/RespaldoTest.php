<?php

use App\Models\VentaDocumento;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->conexionOriginal = config('database.default');
    $this->carpeta = sys_get_temp_dir().'/wolftek-respaldos-'.uniqid();
    config(['wolftek.respaldos.carpeta' => $this->carpeta]);
    $this->travelTo(Carbon::parse('2026-10-26 02:30:00'));
    Storage::fake(VentaDocumento::DISK);
});

afterEach(function () {
    // RefreshDatabase rolls back its transaction on the default connection: give it back the real one.
    config(['database.default' => $this->conexionOriginal]);
    File::deleteDirectory($this->carpeta);
});

/**
 * Names of the files inside a zip.
 *
 * @return list<string>
 */
function contenidoDelZip(string $ruta): array
{
    $zip = new ZipArchive;
    $zip->open($ruta);
    $nombres = array_map(fn (int $i) => $zip->getNameIndex($i), range(0, $zip->numFiles - 1));
    $zip->close();
    sort($nombres);

    return $nombres;
}

/** Point the default connection at a MySQL database (only its settings are read; nothing connects). */
function usarMysql(): void
{
    config([
        'database.default' => 'mysql',
        'database.connections.mysql' => [
            'driver' => 'mysql', 'host' => 'db.interno', 'port' => 3306,
            'database' => 'wolftekguard', 'username' => 'wolftek', 'password' => 'secreto',
        ],
    ]);
}

test('a backup zips the database and every expediente file', function () {
    $sqlite = sys_get_temp_dir().'/wolftek-base-'.uniqid().'.sqlite';
    File::put($sqlite, 'SQLite format 3');
    config(['database.default' => 'respaldo', 'database.connections.respaldo' => ['driver' => 'sqlite', 'database' => $sqlite]]);
    Storage::disk(VentaDocumento::DISK)->put('expedientes/7/INE.pdf', 'pdf');
    Storage::disk(VentaDocumento::DISK)->put('expedientes/9/SAE.pdf', 'pdf');

    $this->artisan('wolftek:respaldo')
        ->expectsOutputToContain('Respaldo creado: wolftek-2026-10-26-023000.zip')
        ->assertSuccessful();

    expect(contenidoDelZip($this->carpeta.'/wolftek-2026-10-26-023000.zip'))
        ->toBe(['base-de-datos.sqlite', 'expedientes/7/INE.pdf', 'expedientes/9/SAE.pdf'])
        ->and(File::glob($this->carpeta.'/*.sqlite'))->toBe([]);

    File::delete($sqlite);
});

test('mysql is dumped with mysqldump without putting the password on the command line', function () {
    usarMysql();
    Process::fake(function (PendingProcess $proceso) {
        $destino = str_replace('--result-file=', '', collect($proceso->command)->first(fn (string $parte) => str_starts_with($parte, '--result-file=')));
        File::put($destino, '-- MySQL dump');

        return Process::result();
    });

    $this->artisan('wolftek:respaldo')->assertSuccessful();

    Process::assertRan(fn (PendingProcess $proceso) => $proceso->command[0] === 'mysqldump'
        && in_array('--single-transaction', $proceso->command, true)
        && end($proceso->command) === 'wolftekguard'
        && ! str_contains(implode(' ', $proceso->command), 'secreto')
        && $proceso->environment['MYSQL_PWD'] === 'secreto');
    expect(contenidoDelZip($this->carpeta.'/wolftek-2026-10-26-023000.zip'))->toBe(['base-de-datos.sql']);
});

test('a failed dump leaves no half-made backup behind', function () {
    usarMysql();
    Process::fake(fn () => Process::result(errorOutput: 'Access denied for user', exitCode: 2));

    $this->artisan('wolftek:respaldo')
        ->expectsOutputToContain('No se pudo crear el respaldo: mysqldump falló: Access denied for user')
        ->assertFailed();

    expect(File::glob($this->carpeta.'/*'))->toBe([]);
});

test('backups older than the days to keep are deleted', function () {
    usarMysql();
    config(['wolftek.respaldos.conservar_dias' => 14]);
    Process::fake(function (PendingProcess $proceso) {
        File::put(str_replace('--result-file=', '', collect($proceso->command)->first(fn (string $parte) => str_starts_with($parte, '--result-file='))), '--');

        return Process::result();
    });
    File::ensureDirectoryExists($this->carpeta);
    File::put($this->carpeta.'/wolftek-2026-10-01-023000.zip', 'viejo');
    touch($this->carpeta.'/wolftek-2026-10-01-023000.zip', now()->subDays(25)->getTimestamp());
    File::put($this->carpeta.'/wolftek-2026-10-20-023000.zip', 'reciente');
    touch($this->carpeta.'/wolftek-2026-10-20-023000.zip', now()->subDays(6)->getTimestamp());

    $this->artisan('wolftek:respaldo')
        ->expectsOutputToContain('Respaldos viejos borrados: 1.')
        ->assertSuccessful();

    expect(array_map('basename', File::glob($this->carpeta.'/*.zip')))
        ->toBe(['wolftek-2026-10-20-023000.zip', 'wolftek-2026-10-26-023000.zip']);
});

test('the backup runs every day on the schedule', function () {
    $this->artisan('schedule:list')->expectsOutputToContain('wolftek:respaldo')->assertSuccessful();
});
