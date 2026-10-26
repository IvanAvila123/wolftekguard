<?php

use App\Models\InventarioImportacion;
use App\Models\InventarioItem;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

const ENCABEZADOS = ['OEM', 'SKU', 'DESCRIPCION', 'MODELO BASE', 'COLOR', 'EBS_MEX', 'EBS_GDL', 'EBS_MTY'];

/**
 * An .xlsx upload with these rows (first row = headers).
 *
 * @param  list<list<mixed>>  $filas
 */
function excelInventario(array $filas, string $nombre = 'inventario.xlsx'): UploadedFile
{
    $libro = new Spreadsheet;
    $libro->getActiveSheet()->fromArray($filas, null, 'A1', true);
    $ruta = tempnam(sys_get_temp_dir(), 'inv').'.xlsx';
    (new Xlsx($libro))->save($ruta);

    return new UploadedFile($ruta, $nombre, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
}

/** An inventory item with pieces per warehouse. */
function itemConStock(string $sku, array $stock, array $atributos = []): InventarioItem
{
    $item = InventarioItem::factory()->create(['sku' => $sku, ...$atributos]);

    foreach ($stock as $almacen => $cantidad) {
        $item->stocks()->create(['almacen' => $almacen, 'cantidad' => $cantidad]);
    }

    return $item;
}

test('guests cannot download the template or import', function () {
    $this->get(route('inventario.plantilla'))->assertRedirect(route('login'));
    $this->post(route('inventario.importar.preview'))->assertRedirect(route('login'));
    $this->post(route('inventario.importar'), ['token' => 'x'])->assertRedirect(route('login'));
});

test('the template is an excel file with the current inventory', function () {
    itemConStock('N.HOX5DMN', ['EBS_MEX' => 64, 'EBS_GDL' => 10, 'EBS_MTY' => 0], [
        'oem' => 'HONOR', 'nombre' => 'HONOR X5D MIDNIGTH BLACK ATT', 'modelo' => 'HONOR X5D', 'color' => 'MIDNIGHT BLACK',
    ]);

    $response = $this->actingAs(User::factory()->create())->get(route('inventario.plantilla'));

    $response->assertOk()->assertDownload('plantilla-inventario.xlsx');

    $ruta = tempnam(sys_get_temp_dir(), 'plantilla').'.xlsx';
    file_put_contents($ruta, $response->streamedContent());
    $filas = IOFactory::load($ruta)->getActiveSheet()->toArray(null, true, false);

    expect($filas[0])->toBe(ENCABEZADOS)
        ->and($filas[1])->toBe(['HONOR', 'N.HOX5DMN', 'HONOR X5D MIDNIGTH BLACK ATT', 'HONOR X5D', 'MIDNIGHT BLACK', 64, 10, 0]);
});

test('the preview says what the file would change without saving anything', function () {
    itemConStock('N.IGUAL', ['EBS_MEX' => 5, 'EBS_GDL' => 0, 'EBS_MTY' => 0], ['oem' => 'APPLE', 'nombre' => 'IGUAL']);
    itemConStock('N.CAMBIA', ['EBS_MEX' => 5, 'EBS_GDL' => 0, 'EBS_MTY' => 0], ['oem' => 'APPLE', 'nombre' => 'CAMBIA']);
    itemConStock('N.AGOTADO', ['EBS_MEX' => 7, 'EBS_GDL' => 0, 'EBS_MTY' => 0], ['oem' => 'APPLE', 'nombre' => 'AGOTADO']);
    itemConStock('N.QUITADO', ['EBS_MEX' => 3, 'EBS_GDL' => 0, 'EBS_MTY' => 0], ['oem' => 'APPLE', 'nombre' => 'QUITADO']);

    $archivo = excelInventario([
        ENCABEZADOS,
        ['APPLE', 'N.IGUAL', 'IGUAL', '', '', 5, 0, 0],
        ['APPLE', 'N.CAMBIA', 'CAMBIA', '', '', 2, 4, 0],
        ['APPLE', 'N.AGOTADO', 'AGOTADO', '', '', 0, 0, 0],
        ['SAMSUNG', 'N.NUEVO', 'NUEVO', '', '', 9, 0, 1],
    ]);

    $this->actingAs(User::factory()->create())
        ->post(route('inventario.importar.preview'), ['archivo' => $archivo])
        ->assertOk()
        ->assertJson([
            'archivo' => 'inventario.xlsx',
            'modelos' => 4,
            'nuevos' => [['sku' => 'N.NUEVO', 'total' => 10]],
            'cambian' => [['sku' => 'N.CAMBIA', 'antes' => 5, 'despues' => 6]],
            'sinStock' => [['sku' => 'N.AGOTADO', 'antes' => 7]],
            'quitados' => [['sku' => 'N.QUITADO', 'total' => 3]],
            'sinCambios' => 1,
        ]);

    expect(InventarioItem::count())->toBe(4)
        ->and(InventarioItem::where('sku', 'N.NUEVO')->exists())->toBeFalse();
});

test('confirming the preview replaces the inventory and records the import', function () {
    $user = User::factory()->create();
    itemConStock('N.CAMBIA', ['EBS_MEX' => 5, 'EBS_GDL' => 0, 'EBS_MTY' => 0], ['oem' => 'APPLE', 'nombre' => 'CAMBIA', 'modelo' => 'IPHONE 17', 'color' => 'AZUL']);
    itemConStock('N.QUITADO', ['EBS_MEX' => 3, 'EBS_GDL' => 0, 'EBS_MTY' => 0]);

    $token = $this->actingAs($user)
        ->post(route('inventario.importar.preview'), ['archivo' => excelInventario([
            ENCABEZADOS,
            ['APPLE', 'N.CAMBIA', 'CAMBIA', '', '', 2, 4, 0],
            ['SAMSUNG', 'N.NUEVO', 'GALAXY A56 GRIS ATT', 'GALAXY A56', 'GRIS', 9, 0, 1],
        ], 'corte-octubre.xlsx')])
        ->json('token');

    $this->actingAs($user)
        ->from(route('inventario'))
        ->post(route('inventario.importar'), ['token' => $token])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('inventario'));

    $cambia = InventarioItem::with('stocks')->where('sku', 'N.CAMBIA')->sole();
    $nuevo = InventarioItem::with('stocks')->where('sku', 'N.NUEVO')->sole();

    expect(InventarioItem::where('sku', 'N.QUITADO')->exists())->toBeFalse()
        ->and([$cambia->stockEn('EBS_MEX'), $cambia->stockEn('EBS_GDL')])->toBe([2, 4])
        ->and([$cambia->modelo, $cambia->color])->toBe(['IPHONE 17', 'AZUL'])
        ->and([$nuevo->modelo, $nuevo->color, $nuevo->stockTotal()])->toBe(['GALAXY A56', 'GRIS', 10]);

    $importacion = InventarioImportacion::sole();
    expect($importacion->only(['user_id', 'archivo', 'modelos', 'nuevos', 'actualizados', 'quitados']))->toBe([
        'user_id' => $user->id, 'archivo' => 'corte-octubre.xlsx', 'modelos' => 2, 'nuevos' => 1, 'actualizados' => 1, 'quitados' => 1,
    ]);

    $this->actingAs($user)->get(route('inventario'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('ultimaImportacion.archivo', 'corte-octubre.xlsx')
            ->where('ultimaImportacion.usuario', $user->name));
});

test('an expired preview cannot be confirmed', function () {
    itemConStock('N.QUEDA', ['EBS_MEX' => 3]);

    $this->actingAs(User::factory()->create())
        ->post(route('inventario.importar'), ['token' => 'no-existe'])
        ->assertSessionHasErrors(['token' => 'La vista previa ya no es válida. Vuelve a subir el archivo.']);

    expect(InventarioItem::where('sku', 'N.QUEDA')->exists())->toBeTrue();
});

test('the preview explains what is wrong with the file', function (array $filas, string $mensaje) {
    $this->actingAs(User::factory()->create())
        ->postJson(route('inventario.importar.preview'), ['archivo' => excelInventario($filas)])
        ->assertUnprocessable()
        ->assertJsonPath('errors.archivo.0', $mensaje);
})->with([
    'missing columns' => [[['OEM', 'SKU', 'DESCRIPCION'], ['APPLE', 'N.X', 'X']], 'Al archivo le faltan las columnas: EBS_MEX, EBS_GDL, EBS_MTY. Descarga la plantilla para ver el formato.'],
    'no header row' => [[['hola'], ['mundo']], 'No encontramos la fila de encabezados (con la columna SKU). Descarga la plantilla para ver el formato.'],
    'not a whole number' => [[ENCABEZADOS, ['APPLE', 'N.X', 'X', '', '', 'diez', 0, 0]], 'Fila 2: EBS_MEX debe ser un número entero de 0 o más.'],
    'negative pieces' => [[ENCABEZADOS, ['APPLE', 'N.X', 'X', '', '', 0, -3, 0]], 'Fila 2: EBS_GDL debe ser un número entero de 0 o más.'],
    'repeated sku' => [[ENCABEZADOS, ['APPLE', 'N.X', 'X', '', '', 1, 0, 0], ['APPLE', 'n.x', 'X', '', '', 1, 0, 0]], 'Fila 3: el SKU N.X ya viene en la fila 2.'],
    'missing sku' => [[ENCABEZADOS, ['APPLE', '', 'X', '', '', 1, 0, 0]], 'Fila 2: falta SKU.'],
    'only headers' => [[ENCABEZADOS], 'El archivo no tiene modelos debajo de los encabezados.'],
]);

test('the preview only accepts excel or csv files', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('inventario.importar.preview'), ['archivo' => UploadedFile::fake()->create('foto.png', 10, 'image/png')])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['archivo' => 'El archivo debe ser Excel (.xlsx, .xls) o CSV.']);
});

test('a csv file can be imported too', function () {
    $csv = "OEM,SKU,Descripción,EBS_MEX,EBS_GDL,EBS_MTY\nHONOR,N.HOX5DMN,HONOR X5D ATT,64,10,0\n";

    $this->actingAs(User::factory()->create())
        ->post(route('inventario.importar.preview'), ['archivo' => UploadedFile::fake()->createWithContent('inventario.csv', $csv)])
        ->assertOk()
        ->assertJson(['modelos' => 1, 'nuevos' => [['sku' => 'N.HOX5DMN', 'total' => 74]]]);
});
