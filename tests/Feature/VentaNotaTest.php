<?php

use App\Models\User;
use App\Models\Venta;

test('a note is added to a sale and logged', function () {
    $user = User::factory()->create();
    $venta = Venta::factory()->create();

    $this->actingAs($user)
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.notas.store', $venta), ['texto' => 'Cliente pide entrega el lunes'])
        ->assertRedirect(route('ventas.show', $venta));

    $nota = $venta->notasSeguimiento()->sole();
    expect($nota->texto)->toBe('Cliente pide entrega el lunes')
        ->and($nota->user_id)->toBe($user->id)
        ->and($venta->eventos()->sole()->texto)->toBe('Nota agregada');
});

test('an empty note is rejected', function () {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('ventas.show', $venta))
        ->post(route('ventas.notas.store', $venta), ['texto' => ''])
        ->assertSessionHasErrors('texto');

    expect($venta->notasSeguimiento()->count())->toBe(0);
});
