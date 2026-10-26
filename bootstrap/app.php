<?php

use App\Http\Middleware\CabecerasDeSeguridad;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            CabecerasDeSeguridad::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // With debug off (production), errors show a page in Spanish with the app's design instead of
        // Laravel's generic one. JSON requests keep their plain status: the offline outbox relies on
        // receiving 404 and 419 as they are.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if (config('app.debug') || ($request->expectsJson() && ! $request->header('X-Inertia'))) {
                return $response;
            }

            // Expired form token (usually after a long pause): back to the page with a message.
            if ($status === 419) {
                return back()->withErrors(['sesion' => 'La página expiró. Vuelve a intentarlo.']);
            }

            if (in_array($status, [403, 404, 429, 500, 503], true)) {
                return Inertia::render('error', ['status' => $status])->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
