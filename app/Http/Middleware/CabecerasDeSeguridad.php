<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CabecerasDeSeguridad
{
    /**
     * Browser security headers for every page.
     *
     * @var array<string, string>
     */
    private const CABECERAS = [
        // Don't guess a file's type: an uploaded "image" can't run as a script.
        'X-Content-Type-Options' => 'nosniff',
        // The app can't be shown inside another site's frame (clickjacking).
        'X-Frame-Options' => 'DENY',
        // Other sites only learn the domain a visitor came from, never a sale's address.
        'Referrer-Policy' => 'strict-origin-when-cross-origin',
        'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=()',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        foreach (self::CABECERAS as $nombre => $valor) {
            $response->headers->set($nombre, $valor);
        }

        // Once seen over https, the browser refuses plain http to this site for a year.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
