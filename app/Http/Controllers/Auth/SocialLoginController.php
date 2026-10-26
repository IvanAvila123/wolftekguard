<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\AbstractUser;
use Laravel\Socialite\Contracts\User as CuentaSocial;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as RedireccionExterna;
use Throwable;

class SocialLoginController extends Controller
{
    /**
     * Providers people can sign in with, in the order the login page shows them.
     *
     * @var array<string, string>
     */
    public const PROVEEDORES = [
        'google' => 'Google',
        'microsoft' => 'Microsoft',
        'facebook' => 'Facebook',
    ];

    /**
     * Providers whose keys are set in .env (Microsoft also needs its tenant).
     *
     * @return list<string>
     */
    public static function activos(): array
    {
        return array_values(array_filter(array_keys(self::PROVEEDORES), function (string $proveedor): bool {
            $config = config("services.{$proveedor}");

            return filled($config['client_id'] ?? null)
                && filled($config['client_secret'] ?? null)
                && ($proveedor !== 'microsoft' || filled($config['tenant'] ?? null));
        }));
    }

    /**
     * Send the user to the provider to sign in.
     */
    public function redirect(string $proveedor): RedireccionExterna
    {
        abort_unless(in_array($proveedor, self::activos(), true), 404);

        return Socialite::driver($proveedor)->redirect();
    }

    /**
     * Back from the provider: sign in the existing user with that verified email.
     * Public registration is closed, so an unknown email does not create an account.
     */
    public function callback(Request $request, string $proveedor): RedirectResponse
    {
        abort_unless(in_array($proveedor, self::activos(), true), 404);
        $nombre = self::PROVEEDORES[$proveedor];

        try {
            $cuenta = Socialite::driver($proveedor)->user();
        } catch (Throwable $error) {
            // Cancelled on the provider's page, an expired state or a provider outage.
            Log::info("Inicio de sesión con {$nombre} fallido", ['error' => $error->getMessage()]);

            return $this->rechazar("No se pudo iniciar sesión con {$nombre}. Intenta de nuevo.");
        }

        $email = $this->correoVerificado($proveedor, $cuenta);

        if ($email === null) {
            return $this->rechazar("Tu cuenta de {$nombre} no tiene un correo verificado.");
        }

        $user = User::whereRaw('lower(email) = ?', [$email])->first();

        if (! $user) {
            return $this->rechazar("No hay una cuenta con el correo {$email}. Pídela a tu administrador.");
        }

        // The provider just proved the person owns this email.
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * The account's email in lowercase, only when the provider vouches that it belongs to that person:
     * Google says so in email_verified, Facebook only shares confirmed emails, and Microsoft is limited
     * to one tenant in config/services.php.
     */
    private function correoVerificado(string $proveedor, CuentaSocial $cuenta): ?string
    {
        $email = $cuenta->getEmail();

        if (blank($email)) {
            return null;
        }

        $datos = $cuenta instanceof AbstractUser ? $cuenta->getRaw() : [];

        if ($proveedor === 'google' && ($datos['email_verified'] ?? false) !== true) {
            return null;
        }

        return Str::lower($email);
    }

    /**
     * Back to the login page with the reason, where the email error is shown.
     */
    private function rechazar(string $mensaje): RedirectResponse
    {
        return to_route('login')->withErrors(['email' => $mensaje]);
    }
}
