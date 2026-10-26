<?php

namespace App\Http\Controllers;

use App\Http\Requests\InventarioImportRequest;
use App\Models\InventarioImportacion;
use App\Models\InventarioItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InventarioImportController extends Controller
{
    /** Where a checked file waits (in the session) until the user confirms the import. */
    private const SESSION_KEY = 'inventario_importacion';

    /**
     * Download the Excel template, already filled with the current inventory.
     */
    public function plantilla(): StreamedResponse
    {
        $libro = new Spreadsheet;
        $hoja = $libro->getActiveSheet();
        $hoja->setTitle('Inventario');
        $hoja->fromArray([['OEM', 'SKU', 'DESCRIPCION', 'MODELO BASE', 'COLOR', ...InventarioItem::ALMACENES]]);

        $filas = InventarioItem::with('stocks')->orderBy('oem')->orderBy('nombre')->get()->map(fn (InventarioItem $item) => [
            $item->oem,
            $item->sku,
            $item->nombre,
            $item->modelo,
            $item->color,
            ...array_map(fn (string $almacen) => $item->stockEn($almacen), InventarioItem::ALMACENES),
        ])->all();

        if ($filas !== []) {
            $hoja->fromArray($filas, null, 'A2', true);
        }

        $hoja->getStyle('A1:H1')->getFont()->setBold(true);
        $hoja->freezePane('A2');

        foreach (range('A', 'H') as $columna) {
            $hoja->getColumnDimension($columna)->setAutoSize(true);
        }

        return response()->streamDownload(
            fn () => (new Xlsx($libro))->save('php://output'),
            'plantilla-inventario.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        );
    }

    /**
     * Read the uploaded file and say what replacing the inventory with it would change. Nothing is saved yet.
     */
    public function vistaPrevia(InventarioImportRequest $request): JsonResponse
    {
        $filas = $request->filas();
        $token = (string) Str::uuid();

        $request->session()->put(self::SESSION_KEY, [
            'token' => $token,
            'archivo' => $request->file('archivo')->getClientOriginalName(),
            'filas' => $filas,
        ]);

        return response()->json([
            'token' => $token,
            'archivo' => $request->file('archivo')->getClientOriginalName(),
            'modelos' => count($filas),
            ...InventarioItem::compararCon($filas),
        ]);
    }

    /**
     * Replace the inventory with the file the user just previewed.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate(['token' => ['required', 'string']]);
        $pendiente = $request->session()->get(self::SESSION_KEY);

        if (! $pendiente || $pendiente['token'] !== $request->string('token')->toString()) {
            throw ValidationException::withMessages(['token' => 'La vista previa ya no es válida. Vuelve a subir el archivo.']);
        }

        $cambios = InventarioItem::compararCon($pendiente['filas']);

        DB::transaction(function () use ($pendiente, $cambios, $request): void {
            InventarioItem::reemplazarCon($pendiente['filas']);

            InventarioImportacion::create([
                'user_id' => $request->user()->id,
                'archivo' => $pendiente['archivo'],
                'modelos' => count($pendiente['filas']),
                'nuevos' => count($cambios['nuevos']),
                'actualizados' => count($cambios['cambian']) + count($cambios['sinStock']),
                'quitados' => count($cambios['quitados']),
            ]);
        });

        $request->session()->forget(self::SESSION_KEY);

        return back();
    }
}
