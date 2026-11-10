<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;
use Throwable;

class InventarioImportRequest extends FormRequest
{
    /**
     * Fixed columns of the inventory file. The key is the field; the values are the accepted header
     * names (compared without accents, case or spaces). Any other column is dynamic: a column of whole
     * numbers is a warehouse (its pieces add up to the stock) and a text column is an extra detail.
     *
     * @var array<string, list<string>>
     */
    public const COLUMNAS = [
        'oem' => ['oem', 'marca'],
        'sku' => ['sku'],
        'nombre' => ['descripcion', 'modelo', 'nombre', 'equipo'],
        'modelo' => ['modelo_base'],
        'color' => ['color'],
    ];

    /** Columns the file must have; "modelo base" and "color" are optional. */
    private const OBLIGATORIAS = ['oem', 'sku', 'nombre'];

    /** Header words that make a number column a detail, never pieces (a price is not stock). */
    private const NO_SON_PIEZAS = ['precio', 'costo', 'importe', 'price', 'cost'];

    /**
     * The dynamic columns found by filas(), in the file's order.
     *
     * @var array{almacenes: list<string>, extras: list<string>}
     */
    private array $columnasLeidas = ['almacenes' => [], 'extras' => []];

    private const MAX_FILAS = 5000;

    private const MAX_ERRORES = 15;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'archivo' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'archivo.required' => 'Elige el archivo de Excel con el inventario.',
            'archivo.mimes' => 'El archivo debe ser Excel (.xlsx, .xls) o CSV.',
            'archivo.max' => 'El archivo no puede pesar más de 5 MB.',
        ];
    }

    /**
     * The warehouse and extra columns of the file read by filas(), in the file's order.
     *
     * @return array{almacenes: list<string>, extras: list<string>}
     */
    public function columnas(): array
    {
        return $this->columnasLeidas;
    }

    /**
     * The inventory rows in the uploaded file, validated.
     *
     * @return list<array{oem: string, sku: string, nombre: string, modelo: ?string, color: ?string, stock: array<string, int>, extras: array<string, string>}>
     *
     * @throws ValidationException
     */
    public function filas(): array
    {
        $hoja = $this->leerHoja();
        $encabezado = $this->buscarEncabezado($hoja);

        $faltan = array_diff(self::OBLIGATORIAS, array_keys($encabezado['columnas']));

        if ($faltan !== []) {
            $nombres = array_map(fn (string $campo) => strtoupper(self::COLUMNAS[$campo][0]), $faltan);

            throw ValidationException::withMessages([
                'archivo' => 'Al archivo le faltan las columnas: '.implode(', ', $nombres).'. Descarga la plantilla para ver el formato.',
            ]);
        }

        $sinPiezas = 'Agrega al menos una columna con las piezas por almacén (por ejemplo EBS_MEX o EXISTENCIA). Descarga la plantilla para ver el formato.';

        if ($encabezado['otras'] === []) {
            throw ValidationException::withMessages(['archivo' => $sinPiezas]);
        }

        $celdaDe = fn (array $celdas, int $posicion): string => trim((string) ($celdas[$posicion] ?? ''));
        $posiciones = [...array_values($encabezado['columnas']), ...array_keys($encabezado['otras'])];
        $renglones = [];

        foreach (array_slice($hoja, $encabezado['fila'] + 1, preserve_keys: true) as $indice => $celdas) {
            if (collect($posiciones)->every(fn (int $posicion) => $celdaDe($celdas, $posicion) === '')) {
                continue;
            }

            $renglones[$indice + 1] = $celdas;
        }

        if ($renglones === []) {
            throw ValidationException::withMessages(['archivo' => 'El archivo no tiene modelos debajo de los encabezados.']);
        }

        [$almacenes, $extras] = $this->clasificarColumnas($encabezado['otras'], $renglones, $celdaDe);

        if ($almacenes === []) {
            throw ValidationException::withMessages(['archivo' => $sinPiezas]);
        }

        $this->columnasLeidas = ['almacenes' => array_values($almacenes), 'extras' => array_values($extras)];

        $filas = [];
        $errores = [];
        $vistos = [];

        foreach ($renglones as $numero => $celdas) {
            $valor = fn (string $campo) => isset($encabezado['columnas'][$campo]) ? $celdaDe($celdas, $encabezado['columnas'][$campo]) : '';

            $sku = strtoupper($valor('sku'));
            $fila = [
                'oem' => strtoupper($valor('oem')),
                'sku' => $sku,
                'nombre' => strtoupper($valor('nombre')),
                'modelo' => $valor('modelo') !== '' ? strtoupper($valor('modelo')) : null,
                'color' => $valor('color') !== '' ? strtoupper($valor('color')) : null,
                'stock' => [],
                'extras' => [],
            ];

            foreach (['sku' => 'SKU', 'oem' => 'OEM', 'nombre' => 'la descripción'] as $campo => $etiqueta) {
                if ($fila[$campo] === '') {
                    $errores[] = "Fila {$numero}: falta {$etiqueta}.";
                }
            }

            if ($sku !== '' && isset($vistos[$sku])) {
                $errores[] = "Fila {$numero}: el SKU {$sku} ya viene en la fila {$vistos[$sku]}.";
            }

            $vistos[$sku] = $numero;

            foreach ($almacenes as $posicion => $almacen) {
                $cantidad = $this->cantidad($celdaDe($celdas, $posicion));

                if ($cantidad === null) {
                    $errores[] = "Fila {$numero}: {$almacen} debe ser un número entero de 0 o más.";
                }

                $fila['stock'][$almacen] = $cantidad ?? 0;
            }

            foreach ($extras as $posicion => $columna) {
                $texto = $celdaDe($celdas, $posicion);

                if ($texto !== '') {
                    $fila['extras'][$columna] = $texto;
                }
            }

            $filas[] = $fila;

            if (count($errores) >= self::MAX_ERRORES || count($filas) > self::MAX_FILAS) {
                break;
            }
        }

        if (count($filas) > self::MAX_FILAS) {
            $errores[] = 'El archivo tiene más de '.self::MAX_FILAS.' modelos. Divídelo en partes.';
        }

        if ($filas === [] && $errores === []) {
            $errores[] = 'El archivo no tiene modelos debajo de los encabezados.';
        }

        if ($errores !== []) {
            throw ValidationException::withMessages(['archivo' => array_slice($errores, 0, self::MAX_ERRORES)]);
        }

        return $filas;
    }

    /**
     * Cells of the first sheet, as rows of plain values.
     *
     * @return array<int, array<int, mixed>>
     */
    private function leerHoja(): array
    {
        $ruta = $this->file('archivo')->getRealPath();

        try {
            $lector = IOFactory::createReaderForFile($ruta);
            $lector->setReadDataOnly(true);

            return $lector->load($ruta)->getSheet(0)->toArray(null, true, false, false);
        } catch (ReaderException|Throwable) {
            throw ValidationException::withMessages(['archivo' => 'No se pudo leer el archivo. Revisa que sea un Excel o CSV válido.']);
        }
    }

    /**
     * The header row (the first one with a "SKU" column), the position of each fixed column in it,
     * and the other named columns by position (their header in capitals).
     *
     * @param  array<int, array<int, mixed>>  $hoja
     * @return array{fila: int, columnas: array<string, int>, otras: array<int, string>}
     */
    private function buscarEncabezado(array $hoja): array
    {
        foreach (array_slice($hoja, 0, 20, true) as $indice => $celdas) {
            $columnas = [];
            $otras = [];

            foreach ($celdas as $posicion => $celda) {
                $nombre = Str::of((string) $celda)->ascii()->lower()->trim()->replaceMatches('/[\s\-]+/', '_')->toString();
                $campo = collect(self::COLUMNAS)->search(fn (array $alias) => in_array($nombre, $alias, true));

                if ($campo !== false && ! isset($columnas[$campo])) {
                    $columnas[$campo] = $posicion;
                } elseif ($campo === false && $nombre !== '') {
                    $titulo = Str::of((string) $celda)->trim()->upper()->replaceMatches('/\s+/', ' ')->toString();

                    if (! in_array($titulo, $otras, true)) {
                        $otras[$posicion] = $titulo;
                    }
                }
            }

            if (isset($columnas['sku'])) {
                return ['fila' => $indice, 'columnas' => $columnas, 'otras' => $otras];
            }
        }

        throw ValidationException::withMessages([
            'archivo' => 'No encontramos la fila de encabezados (con la columna SKU). Descarga la plantilla para ver el formato.',
        ]);
    }

    /**
     * Split the dynamic columns: one whose filled cells are mostly whole numbers is a warehouse (its
     * odd cells are reported as errors, so a typo never turns stock into text); the rest, and any
     * price or cost column, are extra details.
     *
     * @param  array<int, string>  $otras
     * @param  array<int, array<int, mixed>>  $renglones
     * @return array{0: array<int, string>, 1: array<int, string>}
     */
    private function clasificarColumnas(array $otras, array $renglones, callable $celdaDe): array
    {
        $almacenes = [];
        $extras = [];

        foreach ($otras as $posicion => $titulo) {
            $valores = collect($renglones)->map(fn (array $celdas) => $celdaDe($celdas, $posicion))->filter(fn (string $valor) => $valor !== '');
            $numeros = $valores->filter(fn (string $valor) => $this->cantidad($valor) !== null)->count();
            $esDetalle = Str::of($titulo)->ascii()->lower()->contains(self::NO_SON_PIEZAS);

            if (! $esDetalle && $numeros > 0 && $numeros >= $valores->count() - $numeros) {
                $almacenes[$posicion] = $titulo;
            } else {
                $extras[$posicion] = $titulo;
            }
        }

        return [$almacenes, $extras];
    }

    /** A stock cell as a whole number of pieces; empty means 0, anything else invalid is null. */
    private function cantidad(string $valor): ?int
    {
        if ($valor === '') {
            return 0;
        }

        $limpio = str_replace([',', ' '], '', $valor);

        if (! is_numeric($limpio) || (float) $limpio < 0 || floor((float) $limpio) != (float) $limpio) {
            return null;
        }

        return (int) $limpio;
    }
}
