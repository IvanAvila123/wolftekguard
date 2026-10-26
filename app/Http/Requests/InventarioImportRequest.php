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
     * Columns of the inventory file. The key is the field; the values are the accepted header names
     * (compared without accents, case or spaces).
     *
     * @var array<string, list<string>>
     */
    public const COLUMNAS = [
        'oem' => ['oem', 'marca'],
        'sku' => ['sku'],
        'nombre' => ['descripcion', 'modelo', 'nombre', 'equipo'],
        'modelo' => ['modelo_base'],
        'color' => ['color'],
        'EBS_MEX' => ['ebs_mex'],
        'EBS_GDL' => ['ebs_gdl'],
        'EBS_MTY' => ['ebs_mty'],
    ];

    /** Columns the file must have; "modelo base" and "color" are optional. */
    private const OBLIGATORIAS = ['oem', 'sku', 'nombre', 'EBS_MEX', 'EBS_GDL', 'EBS_MTY'];

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
     * The inventory rows in the uploaded file, validated.
     *
     * @return list<array{oem: string, sku: string, nombre: string, modelo: ?string, color: ?string, stock: array<string, int>}>
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

        $filas = [];
        $errores = [];
        $vistos = [];

        foreach (array_slice($hoja, $encabezado['fila'] + 1, preserve_keys: true) as $indice => $celdas) {
            $numero = $indice + 1;
            $valor = fn (string $campo) => trim((string) ($celdas[$encabezado['columnas'][$campo] ?? -1] ?? ''));

            if (collect(array_keys($encabezado['columnas']))->every(fn (string $campo) => $valor($campo) === '')) {
                continue;
            }

            $sku = strtoupper($valor('sku'));
            $fila = [
                'oem' => strtoupper($valor('oem')),
                'sku' => $sku,
                'nombre' => strtoupper($valor('nombre')),
                'modelo' => isset($encabezado['columnas']['modelo']) && $valor('modelo') !== '' ? strtoupper($valor('modelo')) : null,
                'color' => isset($encabezado['columnas']['color']) && $valor('color') !== '' ? strtoupper($valor('color')) : null,
                'stock' => [],
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

            foreach (['EBS_MEX', 'EBS_GDL', 'EBS_MTY'] as $almacen) {
                $cantidad = $this->cantidad($valor($almacen));

                if ($cantidad === null) {
                    $errores[] = "Fila {$numero}: {$almacen} debe ser un número entero de 0 o más.";
                }

                $fila['stock'][$almacen] = $cantidad ?? 0;
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
     * The header row (the first one with a "SKU" column) and the position of each known column in it.
     *
     * @param  array<int, array<int, mixed>>  $hoja
     * @return array{fila: int, columnas: array<string, int>}
     */
    private function buscarEncabezado(array $hoja): array
    {
        foreach (array_slice($hoja, 0, 20, true) as $indice => $celdas) {
            $columnas = [];

            foreach ($celdas as $posicion => $celda) {
                $nombre = Str::of((string) $celda)->ascii()->lower()->trim()->replaceMatches('/[\s\-]+/', '_')->toString();

                foreach (self::COLUMNAS as $campo => $alias) {
                    if (in_array($nombre, $alias, true) && ! isset($columnas[$campo])) {
                        $columnas[$campo] = $posicion;
                    }
                }
            }

            if (isset($columnas['sku'])) {
                return ['fila' => $indice, 'columnas' => $columnas];
            }
        }

        throw ValidationException::withMessages([
            'archivo' => 'No encontramos la fila de encabezados (con la columna SKU). Descarga la plantilla para ver el formato.',
        ]);
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
