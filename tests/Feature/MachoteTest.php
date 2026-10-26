<?php

use App\Models\Machote;
use App\Models\User;

test('a machote can be created', function () {
    $this->actingAs(User::factory()->create())
        ->from(route('machotes'))
        ->post(route('machotes.store'), [
            'name' => 'Nuevo machote',
            'cat' => 'General',
            'preset_status' => 'Captura',
            'preset_prioridad' => 'Media',
            'text' => "Buen día\n\nCLIENTE: {CLIENTE}",
        ])
        ->assertRedirect(route('machotes'));

    expect(Machote::sole()->only(['name', 'uses']))->toBe(['name' => 'Nuevo machote', 'uses' => 0]);
});

test('editing a machote saves its text', function () {
    $machote = Machote::factory()->create(['uses' => 37]);

    $this->actingAs(User::factory()->create())
        ->from(route('machotes'))
        ->put(route('machotes.update', $machote), [
            'name' => $machote->name,
            'cat' => 'IT',
            'preset_status' => 'Líneas Atrapadas',
            'preset_prioridad' => 'Alta',
            'text' => 'Línea: {DN}',
        ])
        ->assertRedirect(route('machotes'));

    expect($machote->refresh()->only(['text', 'preset_status', 'uses']))
        ->toBe(['text' => 'Línea: {DN}', 'preset_status' => 'Líneas Atrapadas', 'uses' => 37]);
});

test('a machote preset must be a known status', function () {
    $machote = Machote::factory()->create();

    $this->actingAs(User::factory()->create())
        ->from(route('machotes'))
        ->put(route('machotes.update', $machote), [...$machote->only(['name', 'cat', 'preset_prioridad', 'text']), 'preset_status' => 'Nada'])
        ->assertSessionHasErrors('preset_status');
});

test('copying a machote counts one use without reloading the page', function () {
    $machote = Machote::factory()->create(['uses' => 4]);

    $this->actingAs(User::factory()->create())
        ->post(route('machotes.usos', $machote))
        ->assertNoContent();

    expect($machote->refresh()->uses)->toBe(5);
});

test('guests cannot count machote uses', function () {
    $machote = Machote::factory()->create(['uses' => 4]);

    $this->post(route('machotes.usos', $machote))->assertRedirect(route('login'));

    expect($machote->refresh()->uses)->toBe(4);
});

test('editing a machote does not reset its use counter', function () {
    $machote = Machote::factory()->create(['uses' => 7]);

    $this->actingAs(User::factory()->create())
        ->put(route('machotes.update', $machote), [
            'name' => 'Líneas atrapadas',
            'cat' => 'Seguimiento',
            'preset_status' => 'Líneas Atrapadas',
            'preset_prioridad' => 'Alta',
            'text' => 'Hola {cliente}',
            'uses' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect($machote->refresh()->uses)->toBe(7);
});
