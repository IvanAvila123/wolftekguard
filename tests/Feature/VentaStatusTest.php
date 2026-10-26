<?php

use App\Models\User;
use App\Models\Venta;
use App\Models\VentaBot;

test('changing a sale status saves it and logs the change', function () {
    $user = User::factory()->create();
    $venta = Venta::factory()->status('Captura')->create();

    $this->actingAs($user)
        ->from(route('ventas.show', $venta))
        ->patch(route('ventas.status', $venta), ['status' => 'Líneas Atrapadas'])
        ->assertRedirect(route('ventas.show', $venta));

    expect($venta->refresh()->status)->toBe('Líneas Atrapadas');

    $evento = $venta->eventos()->sole();
    expect($evento->texto)->toBe('Estatus cambiado a Líneas Atrapadas')
        ->and($evento->user_id)->toBe($user->id);
});

test('setting the same status does not log anything', function () {
    $venta = Venta::factory()->status('Terminado')->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->patch(route('ventas.status', $venta), ['status' => 'Terminado'])
        ->assertRedirect(route('ventas.show', $venta));

    expect($venta->eventos()->count())->toBe(0);
});

test('an unknown status is rejected', function () {
    $venta = Venta::factory()->status('Captura')->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->patch(route('ventas.status', $venta), ['status' => 'Perdida'])
        ->assertSessionHasErrors('status');

    expect($venta->refresh()->status)->toBe('Captura');
});

test('guests cannot change a sale status', function () {
    $venta = Venta::factory()->status('Captura')->create();

    $this->patch(route('ventas.status', $venta), ['status' => 'Terminado'])->assertRedirect(route('login'));

    expect($venta->refresh()->status)->toBe('Captura');
});

test('a closed sale cannot be reopened when one of its dns was sold again', function () {
    $cancelada = Venta::factory()->status('Cancelada')->create();
    VentaBot::factory()->for($cancelada)->withDns(['4774961217'])->create();
    $nueva = Venta::factory()->status('Captura')->create(['razon' => 'TACOS EL GÜERO']);
    VentaBot::factory()->for($nueva)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $cancelada), ['status' => 'Captura'])
        ->assertSessionHasErrors(['status' => 'No se puede reabrir: el DN 4774961217 ya está en otra venta abierta: TACOS EL GÜERO (Captura).']);

    expect($cancelada->refresh()->status)->toBe('Cancelada');
});

test('a closed sale whose dns are free can be reopened', function () {
    $cancelada = Venta::factory()->status('Cancelada')->create();
    VentaBot::factory()->for($cancelada)->withDns(['4774961217'])->create();

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $cancelada), ['status' => 'Captura'])
        ->assertSessionHasNoErrors();

    expect($cancelada->refresh()->status)->toBe('Captura');
});

test('a status change queued while seeing an older status is rejected', function () {
    $venta = Venta::factory()->status('Cancelada')->create(['version' => 2]);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Terminado', 'status_anterior' => 'Captura'])
        ->assertSessionHasErrors(['status' => 'El estatus de esta venta ya había cambiado a Cancelada (en otro equipo o sin conexión). Revísalo antes de cambiarlo.']);

    expect($venta->refresh()->only(['status', 'version']))->toBe(['status' => 'Cancelada', 'version' => 2]);
});

test('a status change based on the current status saves and bumps the version', function () {
    $venta = Venta::factory()->status('Captura')->create(['version' => 2]);

    $this->actingAs(User::factory()->create())
        ->patch(route('ventas.status', $venta), ['status' => 'Reingreso', 'status_anterior' => 'Captura'])
        ->assertSessionHasNoErrors();

    expect($venta->refresh()->only(['status', 'version']))->toBe(['status' => 'Reingreso', 'version' => 3]);
});

test('sending the same status change twice does nothing the second time', function () {
    $venta = Venta::factory()->status('Captura')->create();
    $this->actingAs(User::factory()->create());

    $this->patch(route('ventas.status', $venta), ['status' => 'Reingreso', 'status_anterior' => 'Captura']);
    $this->patch(route('ventas.status', $venta), ['status' => 'Reingreso', 'status_anterior' => 'Captura'])
        ->assertSessionHasNoErrors();

    expect($venta->eventos()->count())->toBe(1);
});
