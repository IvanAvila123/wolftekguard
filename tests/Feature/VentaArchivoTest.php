<?php

use App\Models\InventarioItem;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaBot;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot archive or restore sales', function () {
    $venta = Venta::factory()->create();

    $this->delete(route('ventas.destroy', $venta))->assertRedirect(route('login'));
    $this->post(route('ventas.restore', $venta))->assertRedirect(route('login'));

    expect($venta->refresh()->trashed())->toBeFalse();
});

test('an archived sale leaves the lists and frees its dns', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    $venta = Venta::factory()->status('Captura')->create(['fecha' => '2026-09-14']);
    VentaBot::factory()->for($venta)->withDns(['4771112222'])->create();
    $this->actingAs(User::factory()->create());

    $this->delete(route('ventas.destroy', $venta))
        ->assertRedirect(route('ventas.index', ['mes' => '2026-09']));

    expect($venta->refresh()->trashed())->toBeTrue()
        ->and($venta->eventos()->pluck('texto')->all())->toContain('Venta archivada');

    $this->get('/ventas?mes=2026-09')
        ->assertInertia(fn (Assert $page) => $page
            ->has('ventas', 0)
            ->has('dnsAbiertos', 0)
            ->has('clientes', 0));

    $this->get('/ventas/'.$venta->id)->assertNotFound();
});

test('archiving a finished sale gives its pieces back', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 5])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002'])->create(['sku' => 'N.HOX5DMN']);
    $this->actingAs(User::factory()->create());

    $this->patch(route('ventas.status', $venta), ['status' => 'Terminado']);
    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(3);

    $this->delete(route('ventas.destroy', $venta));
    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(5);

    $this->post(route('ventas.restore', $venta));
    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(3);
});

test('archived sales are only sent when the dialog asks for them', function () {
    $venta = Venta::factory()->create(['razon' => 'TACOS EL GÜERO']);
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002'])->create();
    $venta->archivar();

    $this->actingAs(User::factory()->create())
        ->get('/ventas')
        ->assertInertia(fn (Assert $page) => $page
            ->missing('archivadas')
            ->reloadOnly('archivadas', fn (Assert $reload) => $reload
                ->has('archivadas', 1)
                ->where('archivadas.0.id', $venta->id)
                ->where('archivadas.0.cliente', 'TACOS EL GÜERO')
                ->where('archivadas.0.lineas', 2)));
});

test('a restored sale comes back with its history', function () {
    $venta = Venta::factory()->create();
    $venta->archivar();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.restore', $venta))
        ->assertRedirect(route('ventas.show', $venta));

    expect($venta->refresh()->trashed())->toBeFalse()
        ->and($venta->eventos()->pluck('texto')->all())->toBe(['Venta restaurada', 'Venta archivada']);
});

test('an open sale cannot be restored when another open sale has its dn', function () {
    $archivada = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($archivada)->withDns(['4771112222'])->create();
    $archivada->archivar();
    $nueva = Venta::factory()->status('Captura')->create(['razon' => 'TACOS EL GÜERO']);
    VentaBot::factory()->for($nueva)->withDns(['4771112222'])->create();

    $this->actingAs(User::factory()->create())
        ->post(route('ventas.restore', $archivada))
        ->assertSessionHasErrors(['venta' => 'No se puede restaurar: el DN 4771112222 ya está en otra venta abierta: TACOS EL GÜERO (Captura).']);

    expect($archivada->refresh()->trashed())->toBeTrue();
});

test('restoring a sale that is not archived changes nothing', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 5])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001'])->create(['sku' => 'N.HOX5DMN']);
    $this->actingAs(User::factory()->create());
    $this->patch(route('ventas.status', $venta), ['status' => 'Terminado']);

    $this->post(route('ventas.restore', $venta))->assertRedirect(route('ventas.show', $venta));

    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(4)
        ->and($venta->eventos()->pluck('texto')->all())->not->toContain('Venta restaurada');
});

test('archiving a sale of this month goes back to the list without a month in the address', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->delete(route('ventas.destroy', $venta))
        ->assertRedirect(route('ventas.index'));
});
