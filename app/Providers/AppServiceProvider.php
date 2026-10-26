<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;
use SocialiteProviders\Microsoft\MicrosoftExtendSocialite;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $produccion = $this->app->isProduction();

        // Links and redirects use https in production (nginx on the VPS handles the certificate).
        URL::forceHttps($produccion);

        // migrate:fresh, db:wipe and the like refuse to run against the production database.
        DB::prohibitDestructiveCommands($produccion);

        // While developing and testing, loading a relation inside a loop (N+1) throws instead of
        // quietly slowing every list down as sales grow.
        Model::preventLazyLoading(! $produccion);

        // Requests per minute for each signed-in user (or IP); generous for normal use, stops runaway scripts.
        RateLimiter::for('app', fn (Request $request) => Limit::perMinute(config('wolftek.limite_por_minuto'))
            ->by($request->user()?->id ?: $request->ip()));

        // Microsoft is not built into Socialite: its community provider registers it.
        Event::listen(SocialiteWasCalled::class, [MicrosoftExtendSocialite::class, 'handle']);
    }
}
