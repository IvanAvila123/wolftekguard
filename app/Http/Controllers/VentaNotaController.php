<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VentaNotaController extends Controller
{
    /**
     * Add a note to a sale.
     */
    public function store(Request $request, Venta $venta): RedirectResponse
    {
        $validated = $request->validate([
            'texto' => ['required', 'string', 'max:5000'],
        ]);

        $venta->notasSeguimiento()->create([...$validated, 'user_id' => $request->user()->id]);
        $venta->registrar('Nota agregada', $request->user());

        return back();
    }
}
