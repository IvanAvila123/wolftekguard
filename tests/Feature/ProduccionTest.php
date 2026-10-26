<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('pages carry the browser security headers', function () {
    $this->get('/login')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeaderMissing('Strict-Transport-Security');
});

test('over https the browser is told to always use https', function () {
    $this->get('https://localhost/login')
        ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

test('too many requests in a minute are stopped', function () {
    config(['wolftek.limite_por_minuto' => 3]);
    $this->actingAs(User::factory()->create());

    foreach (range(1, 3) as $intento) {
        $this->get('/inventario')->assertOk();
    }

    $this->get('/inventario')->assertTooManyRequests();
});

test('with debug off an error shows the friendly page in spanish', function () {
    config(['app.debug' => false]);

    $this->actingAs(User::factory()->create())
        ->get('/ventas/999999')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 404));
});

test('json requests keep their plain status for the offline outbox', function () {
    config(['app.debug' => false]);

    $this->actingAs(User::factory()->create())
        ->putJson('/ventas/999999')
        ->assertNotFound()
        ->assertHeaderMissing('X-Inertia');
});
