<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        try {
            Password::sendResetLink(
                $request->only('email')
            );
        } catch (TransportExceptionInterface $error) {
            // The mail server refused or could not be reached (wrong SMTP password, outage):
            // keep the cause in the log and tell the person on the form instead of a 500 page.
            report($error);

            throw ValidationException::withMessages([
                'email' => 'No pudimos enviar el correo en este momento. Intenta de nuevo más tarde o avisa a tu administrador.',
            ]);
        }

        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
