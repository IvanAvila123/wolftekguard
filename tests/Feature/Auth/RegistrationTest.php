<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('public registration is closed', function () {
    $this->get('/register')->assertNotFound();

    $this->post('/register', [
        'name' => 'Intruso',
        'email' => 'intruso@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('the login screen does not offer to create an account', function () {
    $this->get('/login')
        ->assertInertia(fn (Assert $page) => $page->component('auth/login')->where('canRegister', false));
});

test('an admin can create a user from the command line', function () {
    $this->artisan('wolftek:crear-usuario', ['email' => 'ana@wolftek.mx', 'nombre' => 'Ana López'])
        ->expectsQuestion('Contraseña (mínimo 8 caracteres)', 'secreto123')
        ->expectsOutput('Usuario creado: Ana López <ana@wolftek.mx>')
        ->assertSuccessful();

    $user = User::where('email', 'ana@wolftek.mx')->sole();
    expect($user->name)->toBe('Ana López')
        ->and(Hash::check('secreto123', $user->password))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeTrue();
});

test('the command refuses an email that already has an account', function () {
    User::factory()->create(['email' => 'ana@wolftek.mx']);

    $this->artisan('wolftek:crear-usuario', ['email' => 'ana@wolftek.mx', 'nombre' => 'Otra Ana'])
        ->expectsQuestion('Contraseña (mínimo 8 caracteres)', 'secreto123')
        ->expectsOutputToContain('Ya existe una cuenta con ese correo')
        ->assertFailed();

    expect(User::count())->toBe(1);
});
