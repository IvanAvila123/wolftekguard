<?php

use App\Models\InventarioItem;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaBot;
use App\Models\VentaDocumento;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * A valid sale payload as the Nueva venta wizard submits it.
 *
 * @return array<string, mixed>
 */
function ventaPayload(array $overrides = []): array
{
    return array_replace([
        'nombre' => 'RENOVACION - JUAN NOE PADILLA VEGA',
        'razon' => 'JUAN NOE PADILLA VEGA',
        'cuenta' => '507766765',
        'idcte' => '105258030',
        'rfc' => 'PAVJ711110EU6',
        'rl' => 'JUAN NOE PADILLA VEGA',
        'acuerdo' => '11',
        'fp' => '',
        'domicilio' => 'INDEPENDENCIA 15, CENTRO, JALISCO',
        'encargada' => 'ELSA LORENA PADILLA',
        'telefono' => '3957256197',
        'horario' => 'DE 9:00 A 18:00 HRS',
        'tipo' => 'RENOVACION',
        'status' => 'Captura',
        'prioridad' => 'Media',
        'cierre' => '',
        'notas' => '',
        'meses' => [1, 2],
        'bots' => [
            [
                'costo' => '1',
                'equipo' => 'HONOR X5D MIDNIGTH BLACK ATT',
                'sku' => 'N.HOX5DMN',
                'plan' => 'ATTv2 ArmaloNEG 299 C',
                'plazo' => '24 meses',
                'proteccion' => '0',
                'dmr' => '',
                'redes' => 'Facebook',
                'dns' => ['4774961217', '4773792717'],
            ],
            [
                'costo' => '0',
                'equipo' => 'APPLE IPHONE 17 256GB LAVANDA ATT',
                'sku' => 'N.IP17256GL',
                'plan' => 'ATTv2 ArmaloNEG 399 C',
                'plazo' => '36 meses',
                'proteccion' => '1',
                'dmr' => '10%',
                'redes' => '',
                'dns' => ['4774953406'],
            ],
        ],
    ], $overrides);
}

beforeEach(function () {
    InventarioItem::factory()->create(['sku' => 'N.HOX5DMN']);
    InventarioItem::factory()->create(['sku' => 'N.IP17256GL']);
});

test('guests cannot create sales', function () {
    $this->post(route('ventas.store'), ventaPayload())->assertRedirect(route('login'));

    expect(Venta::count())->toBe(0);
});

test('a sale is created with its bots, dn lines and expediente', function () {
    Storage::fake(VentaDocumento::DISK);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('ventas.store'), ventaPayload([
            'documentos' => [
                ['tipo' => 'ine', 'archivo' => UploadedFile::fake()->create('INE.pdf', 120)],
                ['tipo' => 'otros', 'archivo' => UploadedFile::fake()->image('FACHADA.jpg')],
            ],
        ]))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('ventas.created', Venta::sole()));

    $venta = Venta::sole();
    expect($venta->user_id)->toBe($user->id)
        ->and($venta->razon)->toBe('JUAN NOE PADILLA VEGA')
        ->and($venta->meses)->toBe([1, 2])
        ->and($venta->fecha->isToday())->toBeTrue();

    $bots = $venta->bots()->with('lineas')->get();
    expect($bots)->toHaveCount(2)
        ->and($bots[0]->costo)->toBeTrue()
        ->and($bots[0]->lineas->pluck('dn')->all())->toBe(['4774961217', '4773792717'])
        ->and($bots[1]->costo)->toBeFalse()
        ->and($bots[1]->proteccion)->toBeTrue()
        ->and($bots[1]->lineas->pluck('dn')->all())->toBe(['4774953406']);

    $documentos = $venta->documentos;
    expect($documentos->pluck('tipo')->all())->toBe(['ine', 'otros']);
    Storage::disk(VentaDocumento::DISK)->assertExists($documentos->pluck('path')->all());
});

test('a sale needs at least one dn', function () {
    $payload = ventaPayload();
    $payload['bots'] = [[...$payload['bots'][0], 'dns' => []]];

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), $payload)
        ->assertSessionHasErrors(['bots' => 'Agrega al menos un DN.']);

    expect(Venta::count())->toBe(0);
});

test('a dn cannot repeat across bots', function () {
    $payload = ventaPayload();
    $payload['bots'][1]['dns'] = ['4774961217'];

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), $payload)
        ->assertSessionHasErrors('bots.1.dns.0');

    expect(Venta::count())->toBe(0);
});

test('a sale rejects malformed account fields', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload(['cuenta' => '1234', 'telefono' => '12', 'status' => 'Inventado']))
        ->assertSessionHasErrors(['cuenta', 'telefono', 'status']);
});

test('editing a sale replaces its bots and logs what changed', function () {
    $venta = Venta::factory()->create(['acuerdo' => '11', 'status' => 'Captura', 'razon' => 'JUAN NOE PADILLA VEGA']);
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create(['sku' => 'N.HOX5DMN']);
    VentaBot::factory()->for($venta)->withDns(['4773799237'])->create(['posicion' => 1]);
    VentaBot::factory()->for($venta)->withDns(['4791043744'])->create(['posicion' => 2]);

    $payload = ventaPayload(['acuerdo' => '40809174', 'status' => 'Reingreso']);

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('ventas.show', $venta));

    $venta->refresh();
    expect($venta->acuerdo)->toBe('40809174')
        ->and($venta->status)->toBe('Reingreso')
        ->and($venta->bots()->count())->toBe(2)
        ->and($venta->lineas()->pluck('dn')->sort()->values()->all())->toBe(['4773792717', '4774953406', '4774961217']);

    $log = $venta->eventos()->sole()->texto;
    expect($log)->toStartWith('Venta editada: acuerdo → 40809174; estatus → Reingreso; se actualizó ')
        ->and($log)->toContain('BOT 1: 1 → 2 líneas')
        ->and($log)->toContain('BOT 2: ')
        ->and($log)->toEndWith('se quitaron 1 BOT');
});

test('editing a sale can remove and add expediente files', function () {
    Storage::fake(VentaDocumento::DISK);
    $venta = Venta::factory()->create();
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create();
    Storage::disk(VentaDocumento::DISK)->put('expedientes/old.pdf', 'pdf');
    $old = $venta->documentos()->create(['tipo' => 'curp', 'nombre' => 'CURP.pdf', 'path' => 'expedientes/old.pdf']);

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), ventaPayload([
            'documentos_quitar' => [$old->id],
            'documentos' => [['tipo' => 'sae', 'archivo' => UploadedFile::fake()->create('SAE.pdf')]],
        ]))
        ->assertSessionHasNoErrors();

    expect($venta->documentos()->pluck('tipo')->all())->toBe(['sae'])
        ->and($venta->eventos()->sole()->texto)->toContain('expediente actualizado');
    Storage::disk(VentaDocumento::DISK)->assertMissing('expedientes/old.pdf');
});

test('the dashboard lists sales from the database for every user', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    $venta = Venta::factory()->create(['razon' => 'GRUPO INDUSTRIAL MEDINA SA DE CV', 'fecha' => '2026-10-09']);
    VentaBot::factory()->for($venta)->withDns(['4774961217', '4773792717'])->create();

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('ventas', 1)
            ->where('ventas.0.cliente', 'GRUPO INDUSTRIAL MEDINA SA DE CV')
            ->where('ventas.0.fecha', '9 oct 2026')
            ->where('ventas.0.lineas', 2)
            ->where('ventas.0.bots.0.dns', ['4774961217', '4773792717'])
            ->has('inventario')
            ->has('machotes'));
});

test('resending the same sale does not create it twice', function () {
    $user = User::factory()->create();
    $payload = ventaPayload(['client_uuid' => '9b1f6a3e-4c2d-4e8a-9f5b-2d7c8e1a0b34']);

    $this->actingAs($user)->post(route('ventas.store'), $payload)->assertSessionHasNoErrors();
    $venta = Venta::sole();

    $this->actingAs($user)
        ->post(route('ventas.store'), $payload)
        ->assertRedirect(route('ventas.created', $venta));

    expect(Venta::count())->toBe(1)
        ->and($venta->client_uuid)->toBe('9b1f6a3e-4c2d-4e8a-9f5b-2d7c8e1a0b34');
});

test('a sale sent from the offline outbox gets json validation errors', function () {
    $this->actingAs(User::factory()->create())
        ->postJson(route('ventas.store'), ventaPayload(['cuenta' => '123']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('cuenta');
});

test('a sale captured at night mexico keeps that day as its date', function () {
    $this->travelTo(Carbon::parse('2026-10-09 23:30', 'America/Mexico_City'));

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload())
        ->assertSessionHasNoErrors();

    expect(Venta::sole()->fecha->toDateString())->toBe('2026-10-09');
});

test('a new sale rejects dangerous expediente files', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload([
            'documentos' => [
                ['tipo' => 'ine', 'archivo' => UploadedFile::fake()->create('script.php', 1, 'text/x-php')],
            ],
        ]))
        ->assertSessionHasErrors(['documentos.0.archivo' => 'Uno de los documentos no es de un tipo permitido. Sube PDF, imágenes, Word, Excel o correos guardados.']);

    expect(Venta::count())->toBe(0);
});

test('a dn already in another open sale cannot be sold again', function () {
    $abierta = Venta::factory()->status('Captura')->create(['razon' => 'TACOS EL GÜERO']);
    VentaBot::factory()->for($abierta)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload())
        ->assertSessionHasErrors(['bots.0.dns.0' => 'El DN 4774961217 ya está en otra venta abierta: TACOS EL GÜERO (Captura).']);

    expect(Venta::count())->toBe(1);
});

test('a dn from a closed sale can be sold again', function (string $status) {
    $cerrada = Venta::factory()->status($status)->create();
    VentaBot::factory()->for($cerrada)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload())
        ->assertSessionHasNoErrors();

    expect(Venta::count())->toBe(2);
})->with(Venta::STATUSES_CERRADOS);

test('a sale saved as closed does not check its dns against open sales', function () {
    $abierta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($abierta)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), ventaPayload(['status' => 'Cancelada']))
        ->assertSessionHasNoErrors();
});

test('the equipment sku must be in the inventory', function () {
    $payload = ventaPayload();
    $payload['bots'][1]['sku'] = 'N.NOEXISTE';

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.store'), $payload)
        ->assertSessionHasErrors(['bots.1.sku' => 'El equipo N.NOEXISTE no está en el inventario.']);

    expect(Venta::count())->toBe(0);
});

test('editing a sale keeps a sku that a later import removed from the inventory', function () {
    $venta = Venta::factory()->create();
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create(['sku' => 'N.DESCONTINUADO']);
    $payload = ventaPayload();
    $payload['bots'][0]['sku'] = 'N.DESCONTINUADO';

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), $payload)
        ->assertSessionHasNoErrors();

    expect($venta->bots()->first()->sku)->toBe('N.DESCONTINUADO');
});

test('saving a sale as terminado from the form takes its pieces', function () {
    $item = InventarioItem::firstWhere('sku', 'N.HOX5DMN');
    $item->stocks()->create(['almacen' => 'EBS_MEX', 'cantidad' => 10]);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create(['sku' => 'N.HOX5DMN']);

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), ventaPayload(['status' => 'Terminado']))
        ->assertSessionHasNoErrors();

    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(8);
});

test('resending a sale that was archived meanwhile does not create it again', function () {
    $user = User::factory()->create();
    $payload = ventaPayload(['client_uuid' => '9b1f6a3e-4c2d-4e8a-9f5b-2d7c8e1a0b34']);

    $this->actingAs($user)->post(route('ventas.store'), $payload)->assertSessionHasNoErrors();
    Venta::sole()->archivar();

    $this->actingAs($user)
        ->post(route('ventas.store'), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('ventas.index'));

    expect(Venta::withTrashed()->count())->toBe(1);
});

test('saving an edit bumps the sale version', function () {
    $venta = Venta::factory()->create(['version' => 3]);
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), ventaPayload(['version' => 3]))
        ->assertSessionHasNoErrors();

    expect($venta->refresh()->version)->toBe(4);
});

test('an edit made on an older version of the sale does not overwrite it', function () {
    $venta = Venta::factory()->create(['version' => 4, 'acuerdo' => '11', 'status' => 'Cancelada']);
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->putJson(route('ventas.update', $venta), ventaPayload(['version' => 3, 'acuerdo' => '40809174']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['version' => 'Esta venta cambió mientras la editabas']);

    expect($venta->refresh()->only(['acuerdo', 'status', 'version']))
        ->toBe(['acuerdo' => '11', 'status' => 'Cancelada', 'version' => 4])
        ->and($venta->lineas()->pluck('dn')->all())->toBe(['4774961217']);
});

test('an edit queued before versions existed is still saved', function () {
    $venta = Venta::factory()->create(['version' => 4]);
    VentaBot::factory()->for($venta)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->put(route('ventas.update', $venta), ventaPayload())
        ->assertSessionHasNoErrors();

    expect($venta->refresh()->version)->toBe(5);
});
