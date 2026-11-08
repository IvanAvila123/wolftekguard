<?php

namespace App\Console\Commands;

use App\Models\VentaDocumento;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZipArchive;

class Respaldo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'wolftek:respaldo';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Respalda la base de datos y los expedientes en un .zip y borra los respaldos viejos';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $carpeta = config('wolftek.respaldos.carpeta');
        File::ensureDirectoryExists($carpeta);

        $nombre = 'wolftek-'.now()->format('Y-m-d-His');
        $zipRuta = "{$carpeta}/{$nombre}.zip";
        $volcado = null;

        try {
            $volcado = $this->volcarBaseDeDatos("{$carpeta}/{$nombre}");
            $expedientes = $this->comprimir($zipRuta, $volcado);
        } catch (Throwable $error) {
            File::delete($zipRuta);
            $this->error('No se pudo crear el respaldo: '.$error->getMessage());

            return self::FAILURE;
        } finally {
            if ($volcado) {
                File::delete($volcado);
            }
        }

        $borrados = $this->borrarViejos($carpeta, $zipRuta);
        $megas = number_format(File::size($zipRuta) / 1048576, 1);
        $this->info("Respaldo creado: {$nombre}.zip ({$megas} MB, {$expedientes} archivos de expedientes). Respaldos viejos borrados: {$borrados}.");

        return self::SUCCESS;
    }

    /**
     * Dump the default database next to the zip and return the file's path.
     * MySQL/MariaDB use mysqldump, or plain PHP where programs can't be started; SQLite (development) copies its file.
     */
    private function volcarBaseDeDatos(string $base): string
    {
        $conexion = config('database.connections.'.config('database.default'));

        return match ($conexion['driver']) {
            'mysql', 'mariadb' => $this->usarMysqldump()
                ? $this->volcarMysql($conexion, "{$base}.sql")
                : $this->volcarMysqlConPhp("{$base}.sql"),
            'sqlite' => $this->copiarSqlite($conexion['database'], "{$base}.sqlite"),
            default => throw new RuntimeException("no sé respaldar una base {$conexion['driver']}."),
        };
    }

    /**
     * --single-transaction takes a consistent copy without locking the tables people are using.
     * The password goes in MYSQL_PWD, never on the command line where any server user could read it.
     *
     * @param  array<string, mixed>  $conexion
     */
    private function volcarMysql(array $conexion, string $destino): string
    {
        $proceso = Process::timeout(900)
            ->env(['MYSQL_PWD' => (string) $conexion['password']])
            ->run([
                config('wolftek.respaldos.mysqldump'),
                '--single-transaction',
                '--quick',
                '--routines',
                '--no-tablespaces',
                '--host='.$conexion['host'],
                '--port='.$conexion['port'],
                '--user='.$conexion['username'],
                '--result-file='.$destino,
                $conexion['database'],
            ]);

        if ($proceso->failed() || ! File::exists($destino)) {
            throw new RuntimeException('mysqldump falló: '.trim($proceso->errorOutput() ?: $proceso->output()));
        }

        return $destino;
    }

    /**
     * mysqldump needs PHP to start another program (proc_open), which shared hosting such as
     * Hostinger's disables on the command line. "auto" uses it only when it is available.
     */
    private function usarMysqldump(): bool
    {
        return match (config('wolftek.respaldos.metodo')) {
            'mysqldump' => true,
            'php' => false,
            default => function_exists('proc_open'),
        };
    }

    /**
     * Dump without mysqldump: each table's definition and its rows as INSERT statements, all read
     * inside one transaction so every table comes from the same moment. Fine for this app's size;
     * a database of several GB should use mysqldump on a server that allows it.
     */
    private function volcarMysqlConPhp(string $destino): string
    {
        $db = DB::connection();
        $pdo = $db->getPdo();
        $archivo = fopen($destino, 'wb');

        if ($archivo === false) {
            throw new RuntimeException("no se pudo escribir {$destino}.");
        }

        try {
            fwrite($archivo, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n");

            $db->transaction(function () use ($db, $pdo, $archivo): void {
                foreach ($db->select("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'") as $fila) {
                    $tabla = array_values((array) $fila)[0];
                    $definicion = array_values((array) $db->selectOne("SHOW CREATE TABLE `{$tabla}`"))[1];
                    fwrite($archivo, "DROP TABLE IF EXISTS `{$tabla}`;\n{$definicion};\n\n");

                    foreach ($db->table($tabla)->cursor() as $registro) {
                        $valores = array_map(
                            fn (mixed $valor): string => $valor === null ? 'NULL' : $pdo->quote((string) $valor),
                            (array) $registro,
                        );
                        fwrite($archivo, "INSERT INTO `{$tabla}` VALUES (".implode(', ', $valores).");\n");
                    }

                    fwrite($archivo, "\n");
                }
            });

            fwrite($archivo, "SET FOREIGN_KEY_CHECKS=1;\n");
        } finally {
            fclose($archivo);
        }

        return $destino;
    }

    private function copiarSqlite(string $origen, string $destino): string
    {
        if (! File::exists($origen) || ! File::copy($origen, $destino)) {
            throw new RuntimeException("no se pudo copiar la base SQLite {$origen}.");
        }

        return $destino;
    }

    /**
     * Zip the database dump and every expediente file; returns how many expediente files went in.
     */
    private function comprimir(string $zipRuta, string $volcado): int
    {
        $zip = new ZipArchive;

        if ($zip->open($zipRuta, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
            throw new RuntimeException("no se pudo crear {$zipRuta}.");
        }

        $zip->addFile($volcado, 'base-de-datos.'.pathinfo($volcado, PATHINFO_EXTENSION));

        $disco = Storage::disk(VentaDocumento::DISK);
        $archivos = $disco->allFiles('expedientes');

        foreach ($archivos as $archivo) {
            $zip->addFile($disco->path($archivo), $archivo);
        }

        if (! $zip->close()) {
            throw new RuntimeException('no se pudo terminar de escribir el .zip.');
        }

        return count($archivos);
    }

    /**
     * Delete backups older than the configured days, never the one just made. Returns how many went.
     */
    private function borrarViejos(string $carpeta, string $actual): int
    {
        $limite = now()->subDays(config('wolftek.respaldos.conservar_dias'))->getTimestamp();
        $borrados = 0;

        foreach (File::glob("{$carpeta}/wolftek-*.zip") as $respaldo) {
            if ($respaldo !== $actual && File::lastModified($respaldo) < $limite) {
                File::delete($respaldo);
                $borrados++;
            }
        }

        return $borrados;
    }
}
