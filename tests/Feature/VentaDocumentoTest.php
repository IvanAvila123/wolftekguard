<?php

use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDocumento;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake(VentaDocumento::DISK);
});

test('uploading a required document stores it privately and logs it', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'ine',
            'archivos' => [UploadedFile::fake()->create('INE_FRENTE.pdf', 300)],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('ventas.show', $venta));

    $documento = $venta->documentos()->sole();
    expect($documento->tipo)->toBe('ine')
        ->and($documento->nombre)->toBe('INE_FRENTE.pdf')
        ->and($documento->size)->toBe(300 * 1024)
        ->and($venta->eventos()->sole()->texto)->toBe('Se subió INE');
    Storage::disk(VentaDocumento::DISK)->assertExists($documento->path);
});

test('uploading a required document replaces the previous one', function () {
    $venta = Venta::factory()->create();
    Storage::disk(VentaDocumento::DISK)->put('expedientes/viejo.pdf', 'pdf');
    $venta->documentos()->create(['tipo' => 'ine', 'nombre' => 'VIEJO.pdf', 'path' => 'expedientes/viejo.pdf']);

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'ine',
            'archivos' => [UploadedFile::fake()->create('NUEVO.pdf')],
        ]);

    expect($venta->documentos()->pluck('nombre')->all())->toBe(['NUEVO.pdf']);
    Storage::disk(VentaDocumento::DISK)->assertMissing('expedientes/viejo.pdf');
});

test('several otros attachments can be uploaded at once', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'otros',
            'archivos' => [UploadedFile::fake()->image('FACHADA.jpg'), UploadedFile::fake()->create('CORREO.pdf')],
        ])
        ->assertSessionHasNoErrors();

    expect($venta->documentos()->where('tipo', 'otros')->count())->toBe(2)
        ->and($venta->eventos()->sole()->texto)->toBe('Se subió 2 archivos adicionales');
});

test('a required document accepts a single file', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'curp',
            'archivos' => [UploadedFile::fake()->create('A.pdf'), UploadedFile::fake()->create('B.pdf')],
        ])
        ->assertSessionHasErrors('archivos');

    expect($venta->documentos()->count())->toBe(0);
});

test('an unknown document type is rejected', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'pasaporte',
            'archivos' => [UploadedFile::fake()->create('A.pdf')],
        ])
        ->assertSessionHasErrors('tipo');
});

test('an expediente file can be viewed by a signed in user only', function () {
    $venta = Venta::factory()->create();
    Storage::disk(VentaDocumento::DISK)->put('expedientes/ine.pdf', 'contenido');
    $documento = $venta->documentos()->create(['tipo' => 'ine', 'nombre' => 'INE.pdf', 'path' => 'expedientes/ine.pdf']);

    $this->get(route('ventas.documentos.show', [$venta, $documento]))->assertRedirect(route('login'));

    $response = $this->actingAs(User::factory()->create())->get(route('ventas.documentos.show', [$venta, $documento]));
    $response->assertOk();
    expect($response->streamedContent())->toBe('contenido');
});

test('a document is only reachable through its own sale', function () {
    $documento = VentaDocumento::factory()->create(['path' => 'expedientes/x.pdf']);
    $otraVenta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('ventas.documentos.destroy', [$otraVenta, $documento]))
        ->assertNotFound();

    expect($documento->fresh())->not->toBeNull();
});

test('removing a document deletes the file and logs it', function () {
    $venta = Venta::factory()->create();
    Storage::disk(VentaDocumento::DISK)->put('expedientes/oc.pdf', 'pdf');
    $documento = $venta->documentos()->create(['tipo' => 'oc', 'nombre' => 'OC.pdf', 'path' => 'expedientes/oc.pdf']);

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->delete(route('ventas.documentos.destroy', [$venta, $documento]))
        ->assertRedirect(route('ventas.show', $venta));

    expect($documento->fresh())->toBeNull()
        ->and($venta->eventos()->sole()->texto)->toBe('Se quitó OC');
    Storage::disk(VentaDocumento::DISK)->assertMissing('expedientes/oc.pdf');
});

test('a required document must be a pdf or a photo', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'ine',
            'archivos' => [UploadedFile::fake()->create('INE.docx', 50, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')],
        ])
        ->assertSessionHasErrors(['archivos.0' => 'Solo se aceptan PDF o fotos (JPG, PNG o WEBP).']);

    expect($venta->documentos()->count())->toBe(0);
});

test('dangerous files are rejected even as otros attachments', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.documentos.store', $venta), [
            'tipo' => 'otros',
            'archivos' => [UploadedFile::fake()->create('programa.exe', 50, 'application/x-msdownload')],
        ])
        ->assertSessionHasErrors(['archivos.0' => 'Ese tipo de archivo no se acepta. Sube PDF, imágenes, Word, Excel o correos guardados.']);

    expect($venta->documentos()->count())->toBe(0);
});
