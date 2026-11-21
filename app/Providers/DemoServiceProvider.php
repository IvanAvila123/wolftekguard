<?php

namespace App\Providers;

use App\Http\Middleware\DemoBanner;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

/**
 * Modo demo: solo se activa con DEMO_MODE=true.
 * - Muestra el aviso con las credenciales en todas las páginas.
 * - Evita que cambien el correo/usuario o la contraseña del usuario demo, o que lo borren.
 * - Manda los correos al log en lugar de enviarlos.
 * - Permite que `demo:reset` use migrate:fresh aunque el proyecto lo prohíba en producción.
 */
class DemoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (! config('demo.enabled')) {
            return;
        }

        config(['mail.default' => 'log']);

        if ($this->app->runningInConsole()) {
            DB::prohibitDestructiveCommands(false);
        }

        $this->app->make(Kernel::class)->pushMiddleware(DemoBanner::class);

        $field = config('demo.login_field', 'email');
        $isDemoUser = fn (User $user) => $user->getOriginal($field) === config('demo.login');

        User::updating(function (User $user) use ($isDemoUser, $field) {
            if (! $isDemoUser($user)) {
                return;
            }
            foreach (array_unique([$field, 'email', 'password']) as $attr) {
                if ($user->isDirty($attr)) {
                    $user->setAttribute($attr, $user->getOriginal($attr));
                }
            }
        });

        User::deleting(fn (User $user) => $isDemoUser($user) ? false : null);
    }
}
