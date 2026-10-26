<?php

use App\Models\InventarioItem;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaBot;

test('finishing a sale takes one piece per dn from the fullest warehouse first', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 2, 'EBS_GDL' => 5, 'EBS_MTY' => 0])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002', '4771110003'])->create(['sku' => 'N.HOX5DMN']);
    VentaBot::factory()->for($venta)->withDns(['4771110004', '4771110005', '4771110006'])->create(['sku' => 'N.HOX5DMN', 'posicion' => 1]);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Terminado'])
        ->assertSessionHasNoErrors();

    $item->load('stocks');
    expect($item->stockEn('EBS_GDL'))->toBe(0)
        ->and($item->stockEn('EBS_MEX'))->toBe(1)
        ->and((int) $venta->movimientos()->sum('cantidad'))->toBe(6)
        ->and($venta->eventos()->pluck('texto')->all())->toContain('Inventario: se descontaron 6 equipos');
});

test('a bot without dns still takes one piece', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 3])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->create(['sku' => 'N.HOX5DMN']);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Terminado']);

    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(2);
});

test('missing pieces are noted but do not stop a sale from being finished', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 1])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002', '4771110003'])->create(['sku' => 'N.HOX5DMN']);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Terminado'])
        ->assertSessionHasNoErrors();

    expect($venta->refresh()->status)->toBe('Terminado')
        ->and($item->load('stocks')->stockEn('EBS_MEX'))->toBe(0)
        ->and($venta->eventos()->pluck('texto')->all())->toContain('Inventario: se descontaron 1 equipos (2 sin stock)');
});

test('moving a sale out of terminado gives its pieces back', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 2, 'EBS_GDL' => 5])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002'])->create(['sku' => 'N.HOX5DMN']);
    $this->actingAs(User::factory()->create());

    $this->patch(route('ventas.status', $venta), ['status' => 'Terminado']);
    $this->patch(route('ventas.status', $venta), ['status' => 'Cancelada']);

    $item->load('stocks');
    expect($item->stockEn('EBS_MEX'))->toBe(2)
        ->and($item->stockEn('EBS_GDL'))->toBe(5)
        ->and($venta->movimientos()->count())->toBe(0)
        ->and($venta->eventos()->pluck('texto')->all())->toContain('Inventario: se regresaron 2 equipos');
});

test('pieces taken before an excel import are not given back', function () {
    InventarioItem::factory()->withStock(['EBS_MEX' => 5])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001', '4771110002'])->create(['sku' => 'N.HOX5DMN']);
    $this->actingAs(User::factory()->create());

    $this->patch(route('ventas.status', $venta), ['status' => 'Terminado']);
    InventarioItem::reemplazarCon([
        ['oem' => 'HONOR', 'sku' => 'N.HOX5DMN', 'nombre' => 'HONOR X5D', 'modelo' => null, 'color' => null, 'stock' => ['EBS_MEX' => 3]],
    ]);
    $this->patch(route('ventas.status', $venta), ['status' => 'Captura']);

    expect(InventarioItem::firstWhere('sku', 'N.HOX5DMN')->load('stocks')->stockEn('EBS_MEX'))->toBe(3)
        ->and($venta->movimientos()->count())->toBe(0);
});

test('changing between statuses that are not terminado does not touch the inventory', function () {
    $item = InventarioItem::factory()->withStock(['EBS_MEX' => 5])->create(['sku' => 'N.HOX5DMN']);
    $venta = Venta::factory()->status('Captura')->create();
    VentaBot::factory()->for($venta)->withDns(['4771110001'])->create(['sku' => 'N.HOX5DMN']);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Cancelada']);

    expect($item->load('stocks')->stockEn('EBS_MEX'))->toBe(5)
        ->and($venta->movimientos()->count())->toBe(0);
});
