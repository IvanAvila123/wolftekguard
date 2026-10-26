<?php

use App\Models\User;
use App\Models\Venta;
use App\Models\VentaBot;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard'));
});

test('every screen has its own link that opens the app', function (string $path) {
    $venta = Venta::factory()->create();

    $this->actingAs(User::factory()->create())
        ->get(str_replace('{venta}', (string) $venta->id, $path))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('dashboard')->has('ventas', 1));
})->with([
    '/ventas',
    '/ventas/nueva',
    '/ventas/{venta}',
    '/ventas/{venta}/editar',
    '/ventas/{venta}/creada',
    '/inventario',
    '/machotes',
]);

test('a link to a sale that does not exist is a 404', function () {
    $this->actingAs(User::factory()->create())
        ->get('/ventas/999999')
        ->assertNotFound();
});

test('screen links require being signed in', function () {
    $this->get('/ventas')->assertRedirect('/login');
});

test('each sale carries its month for the month filter', function () {
    Venta::factory()->create(['fecha' => '2026-09-14']);

    $this->actingAs(User::factory()->create())
        ->get('/ventas?mes=2026-09')
        ->assertInertia(fn (Assert $page) => $page->where('ventas.0.periodo', '2026-09'));
});

test('the app only sends the sales of the month asked for', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    $septiembre = Venta::factory()->create(['fecha' => '2026-09-30']);
    $octubre = Venta::factory()->create(['fecha' => '2026-10-01']);
    $this->actingAs(User::factory()->create());

    $this->get('/ventas')
        ->assertInertia(fn (Assert $page) => $page
            ->where('periodo', '2026-10')
            ->has('ventas', 1)
            ->where('ventas.0.id', $octubre->id));

    $this->get('/ventas?mes=2026-09')
        ->assertInertia(fn (Assert $page) => $page
            ->where('periodo', '2026-09')
            ->has('ventas', 1)
            ->where('ventas.0.id', $septiembre->id));
});

test('an invalid or future month falls back to this month', function (string $mes) {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));

    $this->actingAs(User::factory()->create())
        ->get('/ventas?mes='.$mes)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('periodo', '2026-10'));
})->with(['2026-13', 'hola', '2027-01']);

test('a link to a sale from another month still opens it', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    $venta = Venta::factory()->create(['fecha' => '2026-08-05']);

    $this->actingAs(User::factory()->create())
        ->get('/ventas/'.$venta->id)
        ->assertInertia(fn (Assert $page) => $page
            ->where('periodo', '2026-10')
            ->has('ventas', 1)
            ->where('ventas.0.id', $venta->id));
});

test('open dns from every month are sent so a dn is not sold twice', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    $abierta = Venta::factory()->status('Captura')->create(['fecha' => '2026-07-10', 'razon' => 'TACOS EL GÜERO']);
    VentaBot::factory()->for($abierta)->withDns(['4771112222'])->create();
    $terminada = Venta::factory()->status('Terminado')->create(['fecha' => '2026-10-02']);
    VentaBot::factory()->for($terminada)->withDns(['4773334444'])->create();

    $this->actingAs(User::factory()->create())
        ->get('/ventas/nueva')
        ->assertInertia(fn (Assert $page) => $page
            ->has('dnsAbiertos', 1)
            ->where('dnsAbiertos.0', ['dn' => '4771112222', 'id' => $abierta->id, 'cliente' => 'TACOS EL GÜERO', 'status' => 'Captura']));
});

test('known clients come grouped by account with their latest details', function () {
    $this->travelTo(Carbon::parse('2026-10-20 12:00'));
    Venta::factory()->create(['cuenta' => '507766765', 'fecha' => '2026-05-12', 'tipo' => 'LINEA NUEVA', 'rfc' => 'PAVJ711110EU6']);
    Venta::factory()->create(['cuenta' => '507766765', 'fecha' => '2026-10-02', 'tipo' => 'RENOVACION', 'rfc' => '']);

    $this->actingAs(User::factory()->create())
        ->get('/ventas/nueva')
        ->assertInertia(fn (Assert $page) => $page
            ->has('clientes', 1)
            ->where('clientes.0.cuenta', '507766765')
            ->where('clientes.0.count', 2)
            ->where('clientes.0.last', '2 oct 2026')
            ->where('clientes.0.lastTipo', 'RENOVACION')
            ->where('clientes.0.rfc', 'PAVJ711110EU6'));
});
