<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\User as CuentaSocial;

beforeEach(function () {
    config(['services.google.client_id' => 'google-id', 'services.google.client_secret' => 'google-secret']);
});

/**
 * The account a provider sends back after signing in.
 *
 * @param  array<string, mixed>  $raw
 */
function cuentaSocial(?string $email, array $raw = []): CuentaSocial
{
    return (new CuentaSocial)->setRaw($raw)->map(['id' => '1234567890', 'name' => 'Ana López', 'email' => $email]);
}

test('the login page offers only the providers that have their keys', function () {
    $this->get('/login')
        ->assertInertia(fn (Assert $page) => $page->where('socialProviders', ['google']));
});

test('microsoft is only offered once its tenant is set', function () {
    config(['services.microsoft.client_id' => 'ms-id', 'services.microsoft.client_secret' => 'ms-secret']);
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('socialProviders', ['google']));

    config(['services.microsoft.tenant' => 'consumers']);
    $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('socialProviders', ['google', 'microsoft']));
});

test('a provider without keys cannot be used', function () {
    $this->get('/auth/facebook')->assertNotFound();
    $this->get('/auth/facebook/callback')->assertNotFound();
});

test('signing in with google goes to google', function () {
    $this->get('/auth/google')->assertRedirectContains('accounts.google.com');
});

test('an existing user signs in with their google account', function () {
    $user = User::factory()->unverified()->create(['email' => 'Ana@Wolftek.mx']);
    Socialite::fake('google', cuentaSocial('ana@wolftek.mx', ['email_verified' => true]));

    $this->get('/auth/google/callback')->assertRedirect('/dashboard');

    $this->assertAuthenticatedAs($user);
    expect($user->refresh()->hasVerifiedEmail())->toBeTrue();
});

test('an email without an account cannot sign in or create one', function () {
    Socialite::fake('google', cuentaSocial('intruso@gmail.com', ['email_verified' => true]));

    $this->get('/auth/google/callback')
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['email' => 'No hay una cuenta con el correo intruso@gmail.com. Pídela a tu administrador.']);

    $this->assertGuest();
    expect(User::count())->toBe(0);
});

test('a google email that is not verified is refused', function () {
    User::factory()->create(['email' => 'ana@wolftek.mx']);
    Socialite::fake('google', cuentaSocial('ana@wolftek.mx', ['email_verified' => false]));

    $this->get('/auth/google/callback')
        ->assertSessionHasErrors(['email' => 'Tu cuenta de Google no tiene un correo verificado.']);

    $this->assertGuest();
});

test('a cancelled or expired sign in returns to the login with a message', function () {
    User::factory()->create(['email' => 'ana@wolftek.mx']);
    Socialite::fake('google', fn () => throw new InvalidStateException);

    $this->get('/auth/google/callback')
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors(['email' => 'No se pudo iniciar sesión con Google. Intenta de nuevo.']);

    $this->assertGuest();
});
